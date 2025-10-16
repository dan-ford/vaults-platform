"use client";

import { useEffect, useState } from "react";
import { Shield, AlertCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

interface WatermarkedViewerProps {
  secret: {
    id: string;
    title: string;
    description: string | null;
    classification: string;
    status: string;
    created_at: string;
  };
  version?: {
    id: string;
    version_number: number;
    content_markdown: string;
    sha256_hash: string;
    created_at: string;
  } | null;
  userEmail: string;
  vaultName: string;
  onDownload?: () => void;
}

export function WatermarkedViewer({
  secret,
  version,
  userEmail,
  vaultName,
  onDownload,
}: WatermarkedViewerProps) {
  const [copyAttempts, setCopyAttempts] = useState(0);

  // Detect copy attempts and warn user
  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      setCopyAttempts(prev => prev + 1);

      // Log copy attempt
      console.warn(`[AUDIT] Copy attempt detected by ${userEmail} for secret ${secret.id}`);

      // Show warning after first attempt
      if (copyAttempts > 0) {
        alert(
          `⚠️ CONFIDENTIAL INFORMATION\n\n` +
          `This content is protected trade secret information. ` +
          `Unauthorized copying or distribution may violate ` +
          `confidentiality agreements and applicable law.\n\n` +
          `Your access is being logged.`
        );
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      alert('Right-click is disabled for confidential content.');
    };

    const handlePrint = (e: Event) => {
      e.preventDefault();
      alert('Printing is disabled for confidential content.');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent Ctrl+P (print), Ctrl+S (save)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 's')) {
        e.preventDefault();
        alert('This action is disabled for confidential content.');
      }
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('beforeprint', handlePrint);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('beforeprint', handlePrint);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [copyAttempts, userEmail, secret.id]);

  const formatTimestamp = () => {
    return new Date().toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  return (
    <div className="relative min-h-[400px] w-full">
      {/* Watermark Overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-10 select-none rotate-[-45deg] transform scale-150">
          <div className="text-6xl font-bold text-slate-900 whitespace-nowrap mb-4">
            CONFIDENTIAL
          </div>
          <div className="text-3xl font-semibold text-slate-700 whitespace-nowrap mb-2">
            {vaultName}
          </div>
          <div className="text-2xl text-slate-600 whitespace-nowrap mb-2">
            {userEmail}
          </div>
          <div className="text-xl text-slate-500 whitespace-nowrap">
            {formatTimestamp()}
          </div>
        </div>
      </div>

      {/* Repeating background watermarks */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-5">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute text-sm font-mono text-slate-600 whitespace-nowrap transform -rotate-45"
            style={{
              top: `${(i % 4) * 25}%`,
              left: `${Math.floor(i / 4) * 20}%`,
            }}
          >
            {vaultName} • {userEmail} • {formatTimestamp()}
          </div>
        ))}
      </div>

      {/* Content Area */}
      <div className="relative z-20 bg-white/95 backdrop-blur-sm border border-gray-300 rounded-lg">
        {/* Header Banner */}
        <div className="bg-red-600 text-white px-4 py-2 flex items-center justify-between border-b-2 border-red-700">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <span className="font-bold">CONFIDENTIAL — TRADE SECRET</span>
          </div>
          <Badge variant="outline" className="bg-white/20 text-white border-white/40">
            {secret.classification}
          </Badge>
        </div>

        {/* Viewer Info Bar */}
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-amber-900 flex-1">
            <p className="font-semibold mb-1">Viewing Restricted Information</p>
            <p>
              Viewer: <span className="font-mono">{userEmail}</span> |
              Vault: {vaultName} |
              Time: {formatTimestamp()} |
              Secret ID: <span className="font-mono text-[10px]">{secret.id}</span>
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-2xl font-bold text-foreground">{secret.title}</h2>
              {secret.status === 'sealed' && (
                <Badge variant="outline" className="bg-slate-200 text-slate-900 border-slate-300">
                  <Shield className="h-3 w-3 mr-1" />
                  SEALED
                </Badge>
              )}
            </div>
            {secret.description && (
              <p className="text-muted-foreground">{secret.description}</p>
            )}
          </div>

          {version ? (
            <div className="space-y-4">
              <div className="border-t pt-4">
                <Label className="text-xs text-muted-foreground">VERSION {version.version_number}</Label>
                <div className="mt-2 p-4 bg-gray-50 rounded-md border select-text">
                  <pre className="whitespace-pre-wrap font-sans text-sm">
                    {version.content_markdown}
                  </pre>
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="text-xs text-muted-foreground mb-2 block">CRYPTOGRAPHIC HASH</Label>
                <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded border block break-all">
                  {version.sha256_hash}
                </code>
              </div>

              <div className="border-t pt-4">
                <Label className="text-xs text-muted-foreground mb-2 block">VERSION INFO</Label>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Created: {new Date(version.created_at).toLocaleString()}</p>
                  <p>Version ID: <span className="font-mono">{version.id}</span></p>
                </div>
              </div>

              {onDownload && (
                <div className="border-t pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onDownload}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Request Download (Requires Reason)
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Downloads are logged to the audit trail with your reason.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>This secret has not been sealed yet.</p>
              <p className="text-sm mt-2">Seal this secret to create an immutable version.</p>
            </div>
          )}
        </div>

        {/* Footer Banner */}
        <div className="bg-red-600 text-white px-4 py-2 text-center text-xs border-t-2 border-red-700">
          CONFIDENTIAL — Unauthorized disclosure prohibited
        </div>
      </div>

      {/* Copy Warning Indicator */}
      {copyAttempts > 0 && (
        <div className="absolute top-4 right-4 z-30 bg-red-100 border border-red-300 rounded-lg p-3 shadow-lg">
          <div className="flex items-center gap-2 text-red-900">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-semibold">
              {copyAttempts} copy attempt{copyAttempts > 1 ? 's' : ''} detected
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
