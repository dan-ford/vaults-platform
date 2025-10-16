"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle2, Copy, Download } from "lucide-react";

interface SealCertificateData {
  versionId: string;
  versionNumber: number;
  hash: string;
  timestamp: string;
  tsa: string;
  serialNumber: string;
}

interface SealCertificateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  secretTitle: string;
  certificate: SealCertificateData;
  vaultName: string;
}

export function SealCertificateDialog({
  open,
  onOpenChange,
  secretTitle,
  certificate,
  vaultName,
}: SealCertificateDialogProps) {
  const handleCopyHash = () => {
    navigator.clipboard.writeText(certificate.hash);
  };

  const handleDownloadCertificate = () => {
    const certificateData = {
      title: "Trade Secret Seal Certificate",
      secretTitle: secretTitle,
      vaultName: vaultName,
      versionNumber: certificate.versionNumber,
      versionId: certificate.versionId,
      sha256Hash: certificate.hash,
      timestamp: certificate.timestamp,
      timestampAuthority: certificate.tsa,
      serialNumber: certificate.serialNumber,
      issuedAt: new Date().toISOString(),
      certificateType: "RFC 3161 Timestamp",
      purpose: "Legal evidence of trade secret protection measures",
      standards: [
        "Defend Trade Secrets Act (DTSA) - United States",
        "Trade Secrets Directive (EU) 2016/943 - European Union",
        "RFC 3161 - Time-Stamp Protocol (TSP)",
      ],
    };

    const blob = new Blob([JSON.stringify(certificateData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `seal-certificate-${certificate.versionId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatTimestamp = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZoneName: "short",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] flex flex-col max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Secret Sealed Successfully
          </DialogTitle>
          <DialogDescription>
            &quot;{secretTitle}&quot; has been cryptographically sealed and timestamped
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 px-1">
          {/* Success Banner */}
          <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <Shield className="h-6 w-6 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-green-900 mb-1">
                Trade Secret Protected
              </h4>
              <p className="text-sm text-green-800">
                This secret is now legally protected with cryptographic evidence. An
                immutable version has been created and can be used as evidence of
                reasonable security measures.
              </p>
            </div>
          </div>

          {/* Certificate Details */}
          <div className="space-y-3 border rounded-lg p-4 bg-gray-50">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Seal Certificate
            </h4>

            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Vault:</span>
                <span className="ml-2 font-medium">{vaultName}</span>
              </div>

              <div>
                <span className="text-muted-foreground">Secret:</span>
                <span className="ml-2 font-medium">{secretTitle}</span>
              </div>

              <div>
                <span className="text-muted-foreground">Version:</span>
                <Badge variant="outline" className="ml-2">
                  v{certificate.versionNumber}
                </Badge>
              </div>

              <div>
                <span className="text-muted-foreground">Timestamp:</span>
                <span className="ml-2 font-mono text-xs">
                  {formatTimestamp(certificate.timestamp)}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground">Timestamp Authority:</span>
                <span className="ml-2 font-mono text-xs break-all">
                  {certificate.tsa}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground">Serial Number:</span>
                <span className="ml-2 font-mono text-xs">
                  {certificate.serialNumber}
                </span>
              </div>

              <div className="pt-2 border-t">
                <span className="text-muted-foreground">SHA-256 Hash:</span>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 px-2 py-1 bg-white border rounded text-xs break-all font-mono">
                    {certificate.hash}
                  </code>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 flex-shrink-0"
                    onClick={handleCopyHash}
                    title="Copy hash"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Legal Context */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Legal Protection:</p>
            <p>
              • This seal demonstrates "reasonable measures" required under the Defend
              Trade Secrets Act (DTSA) in the United States
            </p>
            <p>
              • Complies with the Trade Secrets Directive (EU) 2016/943 requirements for
              confidentiality protection
            </p>
            <p>
              • The RFC 3161 timestamp provides cryptographic proof that this content
              existed at the stated time
            </p>
          </div>

          {/* Next Steps */}
          <div className="border-t pt-3">
            <p className="text-sm font-medium mb-2">Next Steps:</p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Download this certificate for your records</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Configure access controls to restrict who can view this secret</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>All access will be logged to the audit trail</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>
                  If you need to update the secret, a new version will be created
                </span>
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter className="mt-4 gap-2">
          <Button
            variant="outline"
            onClick={handleDownloadCertificate}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Download Certificate
          </Button>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
