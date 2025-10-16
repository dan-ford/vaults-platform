SECRETS MODULE

Why “Secrets” matters (legal backdrop in plain English)

A trade secret is protectable confidential information that has commercial value and is subject to reasonable measures to keep it secret. If you don’t take reasonable steps, you risk losing protection. 
WIPO
+1

In the EU (and UK via retained law), the Trade Secrets Directive (2016/943) harmonises protections and centres on “reasonable steps/measures” (access controls, NDAs, IT controls). 
Winston & Strawn

In the US, the Defend Trade Secrets Act (DTSA) focuses on whether you took reasonable measures; courts look at access limits, NDAs, logging, and policies. 
americanbar.org
+1

To be admissible and persuasive, electronic evidence must be authentic and unchanged (FRE 901/902 in the US; similar principles elsewhere). Hashing, timestamps, and clear chain-of-custody help you meet this. 
Legal Information Institute
+2
Jenner & Block LLP | Law Firm - Homepage
+2

A qualified electronic time stamp under eIDAS carries a presumption of accuracy and integrity across the EU (and the UK recognises eIDAS-derived mechanisms post-Brexit). This is perfect for sealing “secret” entries. 
Better Regulation
+1

RFC 3161 timestamp tokens from a Time-Stamp Authority (TSA) are widely recognised as proof a file existed at a point in time, supporting forensics and litigation. 
IETF
+1

For record immutability, regulators have modernised rules to allow audit-trail approaches in place of strict WORM as long as you can reconstruct records and detect changes—useful as a design analogue. 
Smarsh
+2
archive360.com
+2

Bottom line: A Secrets feature is legally useful only if it (1) enforces reasonable secrecy measures and (2) creates strong evidence (timestamp + integrity + chain of custody).

The “Secrets” module — what we’ll ship
1) Core objects

Secret: title, description (rich text), attachments, tags (e.g., “formula”, “model”, “customer list”), classification (“Trade Secret”), and scope (Vault-scoped).

Secret Version (append-only): every save creates a new version with:

SHA-256 content hash (of the canonicalised payload & files)

RFC 3161 timestamp token from a TSA (stored with version)

Optional Qualified eIDAS timestamp (EU/UK customers) for presumption of accuracy

Signer(s) (creator + optional witness) with signature metadata/certs

Immutable audit record (who, when, IP/UA, method)

Access Rules: per-role (Founder/Investor/Legal/Guest), explicit ACLs, NDA acknowledgment flag.

2) UX flows (frictionless but defensible)

Create & Seal

Author writes/attaches content.

Click “Seal as Trade Secret” → shows a short list of criteria (“Confidential? Restricted access? Marked confidential?”).

On confirm, the app: canonicalises data → computes hash → requests RFC3161 timestamp (and optional eIDAS) → stores token + hash → writes append-only version + audit → flips object state to “Sealed”.

Display a Seal Certificate (ID, hash, TSA token, issuer, clock source, time).

View

Watermarked view (“CONFIDENTIAL – [Vault Name] – [user/email] – [timestamp]”).

Download requires reason code; add to download log; embed watermark + hash.

Update

Editing produces a new sealed version (never mutate the prior one).

Share (need-to-know)

Add specific people/roles; require NDA click-through if not on file; every access is logged.

3) Evidence bundle (for disputes)

Export a ZIP/ASiC with: original files, JSON metadata, SHA-256 hashes, RFC3161 token (and eIDAS QTS if used), full audit trail, and a verification script.

CLI/Script verifies: hash matches; TSA token verifies; cert chain valid; timestamps in bounds.

Technical design (with your stack)
A. Data & RLS (Supabase / Postgres)

Tables (all RLS: deny by default):

secrets (id, vault_id, title, classification, created_by, created_at, …)

secret_versions (id, secret_id, vault_id, version_no, content_canonical_json, sha256_hex, tsa_token (bytea), tsa_policy_oid, tsa_serial, eidas_qts (bytea) null, signed_by jsonb, created_at)

secret_files (id, version_id, vault_id, path, sha256_hex, size)

secret_access (id, secret_id, principal_id/role, nda_ack bool, granted_by, granted_at)

secret_audit (id, secret_id, version_id?, actor_id, action, ip, ua, created_at)

RLS policy shape: users may read only if member of the Vault and explicitly permitted by role/ACL; write by authorised roles; audit always writes.

Storage: Supabase Storage with:

Object prefix: vaults/{vaultId}/secrets/{secretId}/{version}/

Object immutability: enable object versioning and disallow hard-delete in app; emulate WORM via append-only versions + audit-trail (consistent with SEC 17a-4 modernisation principles). 
Smarsh
+1

B. Integrity & timestamping

Compute SHA-256 over canonical JSON + file hashes (Merkle-style if many files). Store root hash in secret_versions.

Call an RFC 3161 TSA (DigiCert or equivalent) to get a TimeStampToken (DER). Store it verbatim and record TSA policy OID & serial. 
IETF
+1

EU/UK option: add an eIDAS Qualified Electronic Time Stamp via a Qualified Trust Service Provider, stored alongside (QTS). This gives presumption of accuracy/integrity under eIDAS Art. 41. 
Better Regulation

Optional co-signature by a second “witness” (company counsel/CTO) using a platform signature (ESIGN/eIDAS advanced signature). Store signer cert metadata.

C. Authentication & evidence rules

Authentication (FRE 901): verification pack + audit + witness testimony will satisfy “what it purports to be”; process description documented in SECURITY.md. 
Legal Information Institute
+1

Chain of custody: secret_audit captures every touch (create, seal, view, download, export), with time, actor, IP/UA—congruent with ISO/IEC 27037 guidance for digital evidence handling. 
ISO
+1

D. Access UX & guardrails

Secret list shows sealed badge and last sealed date.

Open = watermarked, copy-aware (we won’t promise DRM, but we’ll watermark identity and time).

Share = add principal/role; if no NDA on file, present NDA inline (click-wrap), record nda_ack.

Alerts: abnormal access (new device/geo), mass downloads, or after-hours views → email Vault Owners.

Policy & process (what makes it “reasonable measures”)

Marking: Secrets default to “CONFIDENTIAL — TRADE SECRET”.

Least-privilege access: roles + explicit ACL; investors default to no access unless granted.

NDAs: click-wrap + storage of signed PDF or acceptance record per user.

On/Off-boarding: auto-revoke when membership ends; export personal data separately.

Training: a one-page “Trade Secrets Policy” shown and acknowledged in-app on first access.

Incident plan: if a Secret leaks, freeze access, export evidence bundle, and rotate affected access lists.

(All of the above align with “reasonable measures” factors discussed in WIPO and common DTSA/EU commentary.) 
WIPO
+2
Winston & Strawn
+2

Build plan (for Claude Code / Cursor)

Phase 1 — MVP (2 sprints)

DB migrations + RLS for secrets, secret_versions, secret_audit, secret_access, secret_files.

Create & Seal flow: editor → hash → RFC3161 timestamp (via server route) → write version + audit → “Sealed” UI.

View with watermark and download log; append-only versioning.

Portfolio/Org listing: count of sealed Secrets, quick access.

Verification CLI (Node script) to validate hash + TSA token (PEM chain accepted).

Docs: add Trade Secrets Playbook section in SECURITY.md and user-facing “How to Seal” page.

Phase 2 — Legal hardening

eIDAS Qualified time stamp option (toggle at Vault level). 
Better Regulation

Co-signature (witness) support; capture signer cert data.

NDA click-wrap flow and storage; enforcement on first view/share.

Export evidence bundle (ZIP/ASiC) with verify script & README.

Phase 3 — Monitoring & DLP

Anomaly detection (basic rules) + email alerts.

Object storage retention windows and admin-gated purge with audited reason.

Optional block hard delete for Secrets (soft delete only + audit), consistent with audit-trail immutability approach. 
Smarsh

Risks & mitigations

“Blockchain or not?” Not required. Courts care about process + timestamps + chain-of-custody. RFC3161/eIDAS covers it; blockchain adds complexity with little extra probative value. 
IETF

Jurisdiction differences: We rely on general principles (reasonable measures, authenticity) + eIDAS for EU/UK; for US, FRE 901 + audit trail + TSA are enough. 
Legal Information Institute
+1

User friction: Hide complexity—“Seal” is one click; show a simple certificate and a Verify button.

What you’ll be able to say in a dispute

“Here is the sealed version of the information with a trusted timestamp from [TSA], the hash proving it hasn’t changed, the audit log showing who had access, and our policy and NDA acknowledgments showing we took reasonable steps.”
That is the story tribunals look for. 
WIPO
+2
Winston & Strawn
+2