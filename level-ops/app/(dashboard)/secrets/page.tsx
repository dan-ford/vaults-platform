"use client";

import { useState, useEffect } from "react";
import { useCopilotAction, useCopilotReadable } from "@copilotkit/react-core";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Shield, Trash2, Eye, Clock, Lock, Download, History } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/organization-context";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { PermissionGuard, RoleBadge } from "@/components/permissions";
import { SealConfirmationDialog } from "@/components/secrets/seal-confirmation-dialog";
import { SealCertificateDialog } from "@/components/secrets/seal-certificate-dialog";
import { WatermarkedViewer } from "@/components/secrets/watermarked-viewer";
import { VersionHistory } from "@/components/secrets/version-history";
import { NDAClickWrap } from "@/components/secrets/nda-click-wrap";
import { DEFAULT_TENANT_ID } from "@/lib/constants/tenant";

type Secret = {
  id: string;
  vault_id: string;
  tenant_id: string;
  org_id: string;
  title: string;
  description: string | null;
  classification: string;
  status: 'draft' | 'sealed' | 'superseded';
  current_version_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  metadata: any;
};

const STATUS_COLORS = {
  draft: "bg-gray-100 text-gray-800 border-gray-200",
  sealed: "bg-slate-200 text-slate-900 border-slate-300",
  superseded: "bg-muted text-muted-foreground border-border",
};

const CLASSIFICATION_COLORS = {
  "Trade Secret": "bg-slate-300 text-slate-950 border-slate-400",
  "Confidential": "bg-primary/10 text-primary border-primary/20",
  "Internal": "bg-gray-100 text-gray-800 border-gray-200",
};

export default function SecretsPage() {
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [viewingSecret, setViewingSecret] = useState<Secret | null>(null);
  const [viewingVersion, setViewingVersion] = useState<any>(null);
  const [deletingSecret, setDeletingSecret] = useState<Secret | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newSecret, setNewSecret] = useState({
    title: "",
    description: "",
    classification: "Trade Secret",
    contentMarkdown: ""
  });
  const [sealingSecret, setSealingSecret] = useState<Secret | null>(null);
  const [showSealConfirm, setShowSealConfirm] = useState(false);
  const [showSealCertificate, setShowSealCertificate] = useState(false);
  const [sealCertificateData, setSealCertificateData] = useState<any>(null);
  const [showNDA, setShowNDA] = useState(false);
  const [ndaAcceptedFor, setNdaAcceptedFor] = useState<Set<string>>(new Set());
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [viewTab, setViewTab] = useState<'content' | 'history'>('content');

  const supabase = createClient();
  const { currentOrg } = useOrganization();
  const { hasPermission, role, canEdit, canDelete, isViewer } = usePermissions();

  // Load current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUser(data.user);
    });
  }, [supabase]);

  // Load secrets function
  const loadSecrets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !currentOrg) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("secrets")
        .select("*")
        .eq("org_id", currentOrg.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading secrets:", error);
      } else if (data) {
        setSecrets(data);
      }
    } catch (error) {
      console.error("Error in loadSecrets:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load secrets on mount and when page becomes visible
  useEffect(() => {
    if (!currentOrg) return;
    loadSecrets();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadSecrets();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [supabase, currentOrg?.id]);

  // Realtime subscription for live updates
  useEffect(() => {
    if (!currentOrg) return;

    const channel = supabase
      .channel('secrets-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'secrets',
          filter: `org_id=eq.${currentOrg.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setSecrets(current => [payload.new as Secret, ...current]);
          } else if (payload.eventType === 'UPDATE') {
            setSecrets(current => current.map(s => s.id === payload.new.id ? payload.new as Secret : s));
          } else if (payload.eventType === 'DELETE') {
            setSecrets(current => current.filter(s => s.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, currentOrg?.id]);

  // Make secrets readable to the AI
  useCopilotReadable({
    description: "The current list of trade secrets in the vault. Secrets are confidential information protected by legal measures.",
    value: secrets.map(secret => ({
      id: secret.id,
      title: secret.title,
      description: secret.description,
      classification: secret.classification,
      status: secret.status,
      created_at: secret.created_at,
    })),
  });

  // AI action to list secrets
  useCopilotAction({
    name: "listSecrets",
    description: "List all trade secrets in the vault with their status and classification",
    parameters: [],
    handler: async () => {
      const secretsList = secrets.map(s => `- ${s.title} (${s.status}, ${s.classification})`).join('\n');
      return `Found ${secrets.length} secret(s):\n${secretsList}`;
    },
  });

  // AI action to search secrets
  useCopilotAction({
    name: "searchSecrets",
    description: "Search for secrets by title or description",
    parameters: [
      {
        name: "query",
        type: "string",
        description: "Search query to find secrets",
        required: true,
      },
    ],
    handler: async ({ query }) => {
      const filtered = secrets.filter(secret =>
        secret.title.toLowerCase().includes(query.toLowerCase()) ||
        (secret.description?.toLowerCase().includes(query.toLowerCase()) || false)
      );
      return `Found ${filtered.length} secret(s): ${filtered.map(s => s.title).join(", ")}`;
    },
  });

  const handleCreateSecret = async () => {
    if (!currentOrg || !newSecret.title.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setIsCreating(true);

    try {
      const { data, error } = await supabase
        .from("secrets")
        .insert([{
          title: newSecret.title.trim(),
          description: newSecret.description.trim() || null,
          classification: newSecret.classification,
          status: 'draft',
          org_id: currentOrg.id,
          vault_id: currentOrg.id,
          tenant_id: DEFAULT_TENANT_ID, // Legacy field for backward compatibility
          created_by: user.id,
        }] as any)
        .select();

      if (error) throw error;

      // Log to audit trail
      if (data && data.length > 0) {
        await supabase
          .from("secret_audit")
          .insert({
            secret_id: (data as any)[0].id,
            vault_id: currentOrg.id,
            org_id: currentOrg.id,
            actor_id: user.id,
            action: 'create',
            metadata: { title: newSecret.title },
          } as any);
      }

      // Reset form
      setNewSecret({ title: "", description: "", classification: "Trade Secret", contentMarkdown: "" });
      setIsCreating(false);
    } catch (error) {
      console.error("Error creating secret:", error);
      alert('Failed to create secret. Please try again.');
      setIsCreating(false);
    }
  };

  const handleInitiateSeal = (secret: Secret) => {
    setSealingSecret(secret);
    setShowSealConfirm(true);
  };

  const handleConfirmSeal = async () => {
    if (!sealingSecret || !currentOrg) return;

    try {
      // Call seal API
      const response = await fetch('/api/secrets/seal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secretId: sealingSecret.id,
          contentMarkdown: newSecret.contentMarkdown || `# ${sealingSecret.title}\n\n${sealingSecret.description || ''}`,
          contentJson: {
            title: sealingSecret.title,
            description: sealingSecret.description,
            classification: sealingSecret.classification,
          },
          files: [],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to seal secret');
      }

      const result = await response.json();

      // Show certificate
      setSealCertificateData({
        versionId: result.version.id,
        versionNumber: result.version.versionNumber,
        hash: result.version.hash,
        timestamp: result.version.timestamp,
        tsa: result.version.tsa,
        serialNumber: result.version.serialNumber,
      });
      setShowSealConfirm(false);
      setShowSealCertificate(true);

      // Reload secrets to show updated status
      await loadSecrets();
    } catch (error) {
      console.error("Error sealing secret:", error);
      alert(`Failed to seal secret: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleViewSecret = async (secret: Secret) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !currentOrg) return;

    // Check if NDA already accepted for this secret
    if (secret.status === 'sealed' && !ndaAcceptedFor.has(secret.id)) {
      setViewingSecret(secret);
      setShowNDA(true);
      return;
    }

    // Load current version
    if (secret.current_version_id) {
      const { data: versionData } = await supabase
        .from("secret_versions")
        .select("*")
        .eq("id", secret.current_version_id)
        .single();

      if (versionData) {
        setViewingVersion(versionData);
      }
    }

    // Log view to audit trail
    // Note: Anomaly detection happens server-side in the audit trigger
    await supabase
      .from("secret_audit")
      .insert({
        secret_id: secret.id,
        vault_id: currentOrg.id,
        org_id: currentOrg.id,
        actor_id: user.id,
        action: 'view',
        metadata: {},
      } as any);

    setViewingSecret(secret);
    setViewTab('content');
    setIsViewing(true);
  };

  const handleAcceptNDA = async () => {
    if (!viewingSecret || !currentUser || !currentOrg) return;

    try {
      // Log NDA acceptance to audit trail
      await supabase
        .from("secret_audit")
        .insert({
          secret_id: viewingSecret.id,
          vault_id: currentOrg.id,
          org_id: currentOrg.id,
          actor_id: currentUser.id,
          action: 'view',
          metadata: {
            nda_accepted: true,
            timestamp: new Date().toISOString(),
          },
        } as any);

      // Mark NDA as accepted for this session
      setNdaAcceptedFor(prev => new Set(prev).add(viewingSecret.id));
      setShowNDA(false);

      // Continue with viewing
      handleViewSecret(viewingSecret);
    } catch (error) {
      console.error("Error accepting NDA:", error);
      alert("Failed to record NDA acceptance. Please try again.");
    }
  };

  const handleDeclineNDA = () => {
    setShowNDA(false);
    setViewingSecret(null);
  };

  const handleExportEvidence = async (secretId: string) => {
    if (!currentUser || !currentOrg) return;

    try {
      // Trigger download (anomaly detection happens server-side in the API)
      const response = await fetch(`/api/secrets/${secretId}/export-evidence`);

      if (!response.ok) {
        throw new Error('Failed to export evidence');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evidence-${viewingSecret?.title}-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting evidence:", error);
      alert("Failed to export evidence. Please try again.");
    }
  };

  const handleDeleteSecret = async () => {
    if (!deletingSecret || !currentOrg) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Log delete to audit trail
      await supabase
        .from("secret_audit")
        .insert({
          secret_id: deletingSecret.id,
          vault_id: currentOrg.id,
          org_id: currentOrg.id,
          actor_id: user.id,
          action: 'delete',
          metadata: { title: deletingSecret.title },
        } as any);

      // Delete the secret
      const { error } = await supabase
        .from("secrets")
        .delete()
        .eq("id", deletingSecret.id);

      if (error) throw error;

      setSecrets(secrets.filter(s => s.id !== deletingSecret.id));
      setDeletingSecret(null);
    } catch (error) {
      console.error("Error deleting secret:", error);
      alert('Failed to delete secret. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Invalid date";
    }
  };

  const getStatusColor = (status: string) => {
    return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getClassificationColor = (classification: string) => {
    return CLASSIFICATION_COLORS[classification as keyof typeof CLASSIFICATION_COLORS] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  return (
    <div className="container-xl space-y-5 pb-20 animate-fade-in">
      {/* Page Header */}
      <header className="flex items-start justify-between pb-3 border-b border-gray-200">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Secrets</h1>
          <p className="text-sm text-muted-foreground">Securely store and manage trade secrets with cryptographic sealing</p>
          <RoleBadge />
        </div>
        <PermissionGuard require="create">
          <Button
            onClick={() => setIsCreating(true)}
            size="icon"
            className="bg-primary hover:bg-primary/90 text-white rounded-lg h-9 w-9 shadow-sm hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="Create new secret"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </PermissionGuard>
      </header>

      {/* Create Secret Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Create Secret</DialogTitle>
            <DialogDescription>Create a new trade secret for secure storage</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 px-1">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Enter secret title"
                value={newSecret.title}
                onChange={(e) => setNewSecret({ ...newSecret, title: e.target.value })}
                className="bg-white focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                placeholder="Describe the secret (optional)"
                value={newSecret.description}
                onChange={(e) => setNewSecret({ ...newSecret, description: e.target.value })}
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="classification">Classification</Label>
              <select
                id="classification"
                value={newSecret.classification}
                onChange={(e) => setNewSecret({ ...newSecret, classification: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="Trade Secret">Trade Secret</option>
                <option value="Confidential">Confidential</option>
                <option value="Internal">Internal</option>
              </select>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => {
              setIsCreating(false);
              setNewSecret({ title: "", description: "", classification: "Trade Secret", contentMarkdown: "" });
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateSecret}
              disabled={!newSecret.title.trim()}
            >
              Create Secret
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Secret Dialog */}
      <Dialog open={isViewing} onOpenChange={setIsViewing}>
        <DialogContent className="max-h-[90vh] max-w-5xl flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              {viewingSecret?.title}
            </DialogTitle>
            <DialogDescription>
              CONFIDENTIAL — {currentOrg?.name}
            </DialogDescription>
          </DialogHeader>

          {/* Tab Navigation */}
          {viewingSecret?.status === 'sealed' && (
            <div className="flex gap-2 border-b">
              <button
                onClick={() => setViewTab('content')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  viewTab === 'content'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Content
              </button>
              <button
                onClick={() => setViewTab('history')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 ${
                  viewTab === 'history'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <History className="h-4 w-4" />
                Version History
              </button>
            </div>
          )}

          <div className="overflow-y-auto flex-1 px-1">
            {viewTab === 'content' ? (
              viewingSecret?.status === 'sealed' ? (
                <WatermarkedViewer
                  secret={viewingSecret}
                  version={viewingVersion}
                  userEmail={currentUser?.email || ''}
                  vaultName={currentOrg?.name || ''}
                  onDownload={() => handleExportEvidence(viewingSecret.id)}
                />
              ) : (
                <div className="space-y-4 py-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getStatusColor(viewingSecret?.status || 'draft')}>
                      {viewingSecret?.status?.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className={getClassificationColor(viewingSecret?.classification || 'Trade Secret')}>
                      {viewingSecret?.classification}
                    </Badge>
                  </div>
                  {viewingSecret?.description && (
                    <div>
                      <Label>Description</Label>
                      <p className="text-sm text-muted-foreground mt-1">{viewingSecret.description}</p>
                    </div>
                  )}
                  <div className="pt-4 border-t">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Created: {viewingSecret ? formatDate(viewingSecret.created_at) : ''}
                    </p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm text-amber-900">
                      This secret is in draft status. Seal it to create an immutable cryptographically-timestamped version for legal protection.
                    </p>
                  </div>
                </div>
              )
            ) : (
              <div className="py-4">
                {viewingSecret && (
                  <VersionHistory
                    secretId={viewingSecret.id}
                    onViewVersion={(version) => {
                      setViewingVersion(version);
                      setViewTab('content');
                    }}
                  />
                )}
              </div>
            )}
          </div>

          <DialogFooter className="mt-4 gap-2">
            {viewingSecret?.status === 'sealed' && viewTab === 'content' && (
              <Button
                variant="outline"
                onClick={() => handleExportEvidence(viewingSecret.id)}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export Evidence
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsViewing(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NDA Click-Wrap Dialog */}
      {viewingSecret && (
        <NDAClickWrap
          open={showNDA}
          onOpenChange={setShowNDA}
          onAccept={handleAcceptNDA}
          onDecline={handleDeclineNDA}
          secretTitle={viewingSecret.title}
          vaultName={currentOrg?.name || ''}
        />
      )}

      {/* Secrets List */}
      <div className="grid gap-4">
        {isLoading ? (
          <Card className="p-16 flex flex-col items-center justify-center text-center">
            <p className="text-lg font-medium text-muted-foreground">Loading secrets...</p>
          </Card>
        ) : secrets.length === 0 ? (
          <Card className="p-16 flex flex-col items-center justify-center text-center">
            <Shield className="h-12 w-12 text-muted-foreground/50 mb-4" aria-hidden="true" />
            <p className="text-lg font-medium text-muted-foreground mb-2">No secrets yet</p>
            <p className="text-sm text-muted-foreground max-w-md">
              Create your first trade secret using the button above. Secrets can be sealed with cryptographic timestamps for legal protection.
            </p>
          </Card>
        ) : (
          secrets.map((secret) => (
            <Card key={secret.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <h3 className="text-lg font-semibold text-foreground tracking-tight truncate">
                      {secret.title}
                    </h3>
                    <Badge variant="outline" className={getStatusColor(secret.status)}>
                      {secret.status.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className={getClassificationColor(secret.classification)}>
                      {secret.classification}
                    </Badge>
                  </div>
                  {secret.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                      {secret.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{formatDate(secret.created_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {secret.status === 'draft' && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-primary hover:text-primary/80"
                      onClick={() => handleInitiateSeal(secret)}
                      aria-label="Seal secret"
                      title="Seal as Trade Secret"
                    >
                      <Lock className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => handleViewSecret(secret)}
                    aria-label="View secret"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive/80"
                    onClick={() => setDeletingSecret(secret)}
                    aria-label="Delete secret"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingSecret} onOpenChange={(open) => !open && setDeletingSecret(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Secret</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deletingSecret?.title}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingSecret(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteSecret}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Seal Confirmation Dialog */}
      {sealingSecret && (
        <SealConfirmationDialog
          open={showSealConfirm}
          onOpenChange={setShowSealConfirm}
          onConfirm={handleConfirmSeal}
          secretTitle={sealingSecret.title}
        />
      )}

      {/* Seal Certificate Dialog */}
      {sealCertificateData && (
        <SealCertificateDialog
          open={showSealCertificate}
          onOpenChange={setShowSealCertificate}
          secretTitle={sealingSecret?.title || ''}
          certificate={sealCertificateData}
          vaultName={currentOrg?.name || ''}
        />
      )}
    </div>
  );
}
