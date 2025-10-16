"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, CheckCircle2, Clock, Eye, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface SecretVersion {
  id: string;
  version_number: number;
  content_markdown: string;
  sha256_hash: string;
  tsa_token: any;
  tsa_policy_oid: string | null;
  tsa_serial: string | null;
  signed_by: any;
  created_by: string;
  created_at: string;
}

interface VersionHistoryProps {
  secretId: string;
  onViewVersion?: (version: SecretVersion) => void;
}

export function VersionHistory({ secretId, onViewVersion }: VersionHistoryProps) {
  const [versions, setVersions] = useState<SecretVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadVersions();
  }, [secretId]);

  const loadVersions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("secret_versions")
        .select("*")
        .eq("secret_id", secretId)
        .order("version_number", { ascending: false });

      if (error) {
        console.error("Error loading versions:", error);
      } else if (data) {
        setVersions(data);
      }
    } catch (error) {
      console.error("Error in loadVersions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  const getSignersText = (signedBy: any) => {
    if (!signedBy || !Array.isArray(signedBy)) return "Unknown";
    return signedBy.map(s => s.role || "User").join(", ");
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-muted-foreground">Loading version history...</p>
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="p-8 text-center">
        <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">No sealed versions yet</p>
        <p className="text-xs text-muted-foreground mt-2">
          Seal this secret to create an immutable version
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gray-200" />

        {/* Version items */}
        <div className="space-y-6">
          {versions.map((version, index) => (
            <div key={version.id} className="relative flex items-start gap-4">
              {/* Timeline dot */}
              <div className="relative z-10 flex-shrink-0">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  index === 0
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  <Shield className="h-5 w-5" />
                </div>
              </div>

              {/* Version card */}
              <div className="flex-1 pb-6">
                <div className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">Version {version.version_number}</h4>
                        {index === 0 && (
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                            Current
                          </Badge>
                        )}
                        <Badge variant="outline" className="bg-slate-200 text-slate-900 border-slate-300">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Sealed
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimestamp(version.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Version details */}
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Signed by:</span>
                      <span className="ml-2">{getSignersText(version.signed_by)}</span>
                    </div>

                    {version.tsa_serial && (
                      <div>
                        <span className="text-muted-foreground">Timestamp Serial:</span>
                        <span className="ml-2 font-mono text-xs">{version.tsa_serial}</span>
                      </div>
                    )}

                    <div>
                      <span className="text-muted-foreground">Hash:</span>
                      <code className="ml-2 text-xs font-mono bg-gray-100 px-1 py-0.5 rounded break-all">
                        {version.sha256_hash.substring(0, 16)}...
                      </code>
                    </div>
                  </div>

                  {/* Actions */}
                  {onViewVersion && (
                    <div className="mt-4 pt-4 border-t flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewVersion(version)}
                        className="gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        View Version
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 border rounded-lg p-4">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{versions.length}</span> sealed version{versions.length !== 1 ? 's' : ''} •
          All versions are cryptographically timestamped and immutable
        </p>
      </div>
    </div>
  );
}
