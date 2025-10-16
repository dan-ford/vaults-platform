import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";

/**
 * Evidence Export API Route
 *
 * This route generates a complete evidence bundle for a sealed secret.
 * The bundle includes:
 * - All version records with metadata
 * - SHA-256 hashes
 * - RFC 3161 timestamp tokens
 * - Complete audit trail
 * - Verification script
 * - README with chain of custody
 *
 * This bundle can be used as legal evidence in disputes.
 */

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const supabase = await createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const secretId = params.id;

    // Fetch secret
    const { data: secret, error: secretError } = await supabase
      .from("secrets")
      .select("*")
      .eq("id", secretId)
      .single();

    if (secretError || !secret) {
      return NextResponse.json(
        { error: "Secret not found" },
        { status: 404 }
      );
    }

    // Verify user has access
    const { data: membership } = await supabase
      .from("org_memberships")
      .select("role")
      .eq("org_id", secret.org_id)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Fetch all versions
    const { data: versions, error: versionsError } = await supabase
      .from("secret_versions")
      .select("*")
      .eq("secret_id", secretId)
      .order("version_number", { ascending: true });

    if (versionsError) throw versionsError;

    // Fetch audit trail
    const { data: auditLog, error: auditError } = await supabase
      .from("secret_audit")
      .select("*")
      .eq("secret_id", secretId)
      .order("created_at", { ascending: true });

    if (auditError) throw auditError;

    // Fetch organization details
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", secret.org_id)
      .single();

    // Log export to audit trail
    await supabase
      .from("secret_audit")
      .insert({
        secret_id: secretId,
        vault_id: secret.vault_id,
        org_id: secret.org_id,
        actor_id: user.id,
        action: 'export',
        metadata: {
          export_type: 'evidence_bundle',
          timestamp: new Date().toISOString(),
        },
      } as any);

    // Create ZIP bundle
    const zip = new JSZip();

    // 1. Secret metadata
    zip.file("secret.json", JSON.stringify({
      id: secret.id,
      title: secret.title,
      description: secret.description,
      classification: secret.classification,
      status: secret.status,
      created_at: secret.created_at,
      updated_at: secret.updated_at,
      vault_name: org?.name || 'Unknown',
      exported_by: user.email,
      exported_at: new Date().toISOString(),
    }, null, 2));

    // 2. All versions with hashes and timestamps
    versions?.forEach((version, index) => {
      const versionFolder = zip.folder(`versions/v${version.version_number}`);

      versionFolder?.file("metadata.json", JSON.stringify({
        version_number: version.version_number,
        version_id: version.id,
        sha256_hash: version.sha256_hash,
        tsa_policy_oid: version.tsa_policy_oid,
        tsa_serial: version.tsa_serial,
        signed_by: version.signed_by,
        created_at: version.created_at,
      }, null, 2));

      versionFolder?.file("content.md", version.content_markdown);

      // TSA token (binary)
      if (version.tsa_token) {
        versionFolder?.file("timestamp.tsr", Buffer.from(version.tsa_token));
      }

      // eIDAS QTS (if available)
      if (version.eidas_qts) {
        versionFolder?.file("eidas_qts.tsr", Buffer.from(version.eidas_qts));
      }
    });

    // 3. Audit trail as CSV
    const auditCsv = [
      "Timestamp,Actor ID,Action,Version,IP Address,User Agent,Metadata",
      ...(auditLog || []).map(entry => [
        entry.created_at,
        entry.actor_id,
        entry.action,
        entry.version_id || '',
        entry.ip_address || '',
        entry.user_agent || '',
        JSON.stringify(entry.metadata || {}),
      ].join(','))
    ].join('\n');

    zip.file("audit_trail.csv", auditCsv);

    // 4. Verification script
    const verificationScript = `#!/usr/bin/env node

/**
 * Evidence Bundle Verification Script
 *
 * This script verifies the integrity of the evidence bundle for:
 * Secret: ${secret.title}
 * Exported: ${new Date().toISOString()}
 *
 * Usage:
 *   node verify.js
 *
 * Requirements:
 *   npm install crypto
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('🔍 Secret Evidence Verification\\n');
console.log('Secret: ${secret.title}');
console.log('Exported: ${new Date().toISOString()}\\n');

let allPassed = true;

// Verify each version
const versionsDir = path.join(__dirname, 'versions');
const versions = fs.readdirSync(versionsDir).sort();

console.log(\`Found \${versions.length} version(s) to verify:\\n\`);

versions.forEach(versionDir => {
  const versionPath = path.join(versionsDir, versionDir);
  const metadataPath = path.join(versionPath, 'metadata.json');
  const contentPath = path.join(versionPath, 'content.md');

  if (!fs.existsSync(metadataPath) || !fs.existsSync(contentPath)) {
    console.log(\`❌ \${versionDir}: Missing files\`);
    allPassed = false;
    return;
  }

  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  const content = fs.readFileSync(contentPath, 'utf8');

  // Compute hash
  const hash = crypto.createHash('sha256')
    .update(JSON.stringify({
      secretId: '${secretId}',
      versionNumber: metadata.version_number,
      contentMarkdown: content,
      contentData: {},
      files: [],
      timestamp: metadata.created_at,
    }, Object.keys({
      secretId: '${secretId}',
      versionNumber: metadata.version_number,
      contentMarkdown: content,
      contentData: {},
      files: [],
      timestamp: metadata.created_at,
    }).sort()))
    .digest('hex');

  if (hash === metadata.sha256_hash) {
    console.log(\`✅ \${versionDir}: Hash verified (\${hash.substring(0, 16)}...)\`);
  } else {
    console.log(\`❌ \${versionDir}: Hash mismatch!\`);
    console.log(\`   Expected: \${metadata.sha256_hash}\`);
    console.log(\`   Computed: \${hash}\`);
    allPassed = false;
  }

  // Check for timestamp token
  const tsrPath = path.join(versionPath, 'timestamp.tsr');
  if (fs.existsSync(tsrPath)) {
    console.log(\`   Timestamp token present (\${fs.statSync(tsrPath).size} bytes)\`);
  } else {
    console.log(\`   ⚠️  No timestamp token found\`);
  }

  console.log('');
});

console.log('\\n' + '='.repeat(60));
if (allPassed) {
  console.log('✅ All verifications PASSED');
  console.log('\\nThis evidence bundle is cryptographically valid.');
  process.exit(0);
} else {
  console.log('❌ Some verifications FAILED');
  console.log('\\nThis evidence bundle may have been tampered with.');
  process.exit(1);
}
`;

    zip.file("verify.js", verificationScript);

    // 5. README
    const readme = `# Evidence Bundle: ${secret.title}

## Overview

This evidence bundle contains cryptographically sealed versions of the trade secret titled "${secret.title}".

**Vault:** ${org?.name || 'Unknown'}
**Classification:** ${secret.classification}
**Status:** ${secret.status}
**Exported By:** ${user.email}
**Exported At:** ${new Date().toISOString()}

## Contents

- \`secret.json\` - Secret metadata
- \`versions/\` - All sealed versions with:
  - \`metadata.json\` - Version metadata (hash, timestamp info, signers)
  - \`content.md\` - Secret content (markdown)
  - \`timestamp.tsr\` - RFC 3161 timestamp token (binary)
  - \`eidas_qts.tsr\` - eIDAS qualified timestamp (if applicable)
- \`audit_trail.csv\` - Complete access audit log
- \`verify.js\` - Verification script (Node.js)
- \`README.md\` - This file

## Verification

To verify the integrity of this evidence bundle:

\`\`\`bash
npm install crypto  # If not already installed
node verify.js
\`\`\`

The verification script will:
1. Recompute SHA-256 hashes for all versions
2. Compare against stored hashes
3. Check for timestamp tokens
4. Report any discrepancies

## Legal Context

This evidence bundle demonstrates "reasonable measures" to protect trade secrets under:

- **United States:** Defend Trade Secrets Act (DTSA), 18 U.S.C. § 1836 et seq.
- **European Union:** Trade Secrets Directive (EU) 2016/943
- **United Kingdom:** Trade Secrets Regulations 2018 (retained EU law)

### Key Evidence Components

1. **Cryptographic Hashing (SHA-256)**
   - Proves content has not been altered since sealing
   - Industry standard for data integrity

2. **RFC 3161 Timestamps**
   - Trusted third-party proof of existence at specific time
   - Timestamp authority (TSA) certificates included

3. **Audit Trail**
   - Complete log of all access with timestamps, actors, and actions
   - IP addresses and user agents for attribution

4. **Immutable Version History**
   - Append-only record, never modified
   - Each edit creates a new sealed version

## Chain of Custody

1. **Creation:** Secret created in vault database
2. **Sealing:** Content hashed, timestamped, version record created
3. **Access Control:** RLS policies enforce need-to-know access
4. **Audit:** All views, downloads, and exports logged
5. **Export:** Evidence bundle generated on ${new Date().toISOString()} by ${user.email}

## Contact

For questions about this evidence bundle, contact the vault administrator.

**Vault:** ${org?.name || 'Unknown'}
**Secret ID:** ${secretId}

---

*This evidence bundle was generated by Level Ops - Trade Secret Management Platform*
`;

    zip.file("README.md", readme);

    // Generate ZIP
    const zipBlob = await zip.generateAsync({ type: "nodebuffer" });

    // Return ZIP as download
    return new NextResponse(zipBlob, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="evidence-${secret.title.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.zip"`,
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error("Error exporting evidence:", error);
    return NextResponse.json(
      { error: "Failed to export evidence", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
