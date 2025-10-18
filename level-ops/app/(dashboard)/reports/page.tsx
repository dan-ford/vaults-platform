"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/organization-context";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { PermissionGuard, RoleBadge } from "@/components/permissions";
import { ReportGenerator } from "@/lib/services/report-generator";
import { generateContentHash } from "@/lib/utils/content-hash";
import { FileText, Download, Trash2, Calendar, TrendingUp, BarChart, CheckCircle, XCircle, Send, Lock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface Report {
  id: string;
  title: string;
  type: "weekly_summary" | "monthly_summary" | "custom";
  period_start: string;
  period_end: string;
  content_markdown: string;
  stats: any;
  created_at: string;
  approval_status: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  is_published: boolean | null;
  published_at: string | null;
  content_hash: string | null;
  created_by: string;
}

type ApprovalStatus = "draft" | "pending_approval" | "approved" | "rejected";
type ReportFilter = "all" | ApprovalStatus | "published";

const STATUS_COLORS = {
  draft: "bg-slate-100 text-slate-800 border-slate-200",
  pending_approval: "bg-amber-100 text-amber-800 border-amber-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
};

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState<ReportFilter>("all");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [reportType, setReportType] = useState<"weekly_summary" | "monthly_summary">("weekly_summary");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("current");

  const { currentOrg } = useOrganization();
  const { hasPermission, role, canEdit, canDelete, isViewer, isOwner, isAdmin } = usePermissions();
  const supabase = createClient();
  const reportGenerator = new ReportGenerator();

  const canApprove = isOwner || isAdmin;

  // Load reports
  const loadReports = async () => {
    if (!currentOrg) return;

    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("org_id", currentOrg.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading reports:", error);
    } else if (data) {
      setReports(data);
    }
  };

  // Load on mount and visibility change
  useEffect(() => {
    loadReports();

    const handleVisibilityChange = () => {
      if (!document.hidden) loadReports();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [currentOrg?.id]);

  // Realtime subscription
  useEffect(() => {
    if (!currentOrg) return;

    const channel = supabase
      .channel("reports-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reports",
          filter: `org_id=eq.${currentOrg.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            loadReports(); // Reload all to maintain proper sorting
          } else if (payload.eventType === "DELETE") {
            setReports((prev) =>
              prev.filter((r) => r.id !== (payload.old as Report).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrg?.id]);

  // Generate report
  const handleGenerateReport = async () => {
    if (!currentOrg) return;

    setIsGenerating(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let periodStart: Date;
      let periodEnd: Date;
      let title: string;

      if (reportType === "weekly_summary") {
        if (selectedPeriod === "current") {
          periodStart = getWeekStart(new Date());
        } else {
          periodStart = getWeekStart(new Date());
          periodStart.setDate(periodStart.getDate() - 7);
        }
        periodEnd = new Date(periodStart);
        periodEnd.setDate(periodEnd.getDate() + 7);
        title = `Weekly Summary - ${periodStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
      } else {
        const now = new Date();
        if (selectedPeriod === "current") {
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        } else {
          periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        }
        periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0);
        title = `Monthly Summary - ${periodStart.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`;
      }

      // Generate markdown content
      const contentMarkdown =
        reportType === "weekly_summary"
          ? await reportGenerator.generateWeeklySummary(
              currentOrg.id,
              currentOrg.name,
              periodStart
            )
          : await reportGenerator.generateMonthlySummary(
              currentOrg.id,
              currentOrg.name,
              periodStart
            );

      // Gather stats
      const stats = await reportGenerator.gatherStats(
        currentOrg.id,
        periodStart,
        periodEnd
      );

      // Save to database with draft status
      const { error } = await supabase.from("reports").insert({
        org_id: currentOrg.id,
        title,
        type: reportType,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        content_markdown: contentMarkdown,
        stats,
        created_by: user.id,
        approval_status: "draft",
      } as any);

      if (error) throw error;

      setShowGenerateDialog(false);
      setSelectedPeriod("current");
    } catch (error) {
      console.error("Error generating report:", error);
      alert("Failed to generate report. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Submit for approval
  const handleSubmitForApproval = async (report: Report) => {
    try {
      const { error } = await supabase
        .from("reports")
        .update({ approval_status: "pending_approval" })
        .eq("id", report.id);

      if (error) throw error;
    } catch (error) {
      console.error("Error submitting for approval:", error);
      alert("Failed to submit for approval");
    }
  };

  // Approve report
  const handleApprove = async (report: Report) => {
    if (!canApprove) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("reports")
        .update({
          approval_status: "approved",
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", report.id);

      if (error) throw error;
    } catch (error) {
      console.error("Error approving report:", error);
      alert("Failed to approve report");
    }
  };

  // Reject report
  const handleReject = async () => {
    if (!canApprove || !selectedReport) return;

    try {
      const { error } = await supabase
        .from("reports")
        .update({
          approval_status: "rejected",
          rejection_reason: rejectionReason,
        })
        .eq("id", selectedReport.id);

      if (error) throw error;

      setShowRejectDialog(false);
      setSelectedReport(null);
      setRejectionReason("");
    } catch (error) {
      console.error("Error rejecting report:", error);
      alert("Failed to reject report");
    }
  };

  // Publish report (immutable)
  const handlePublish = async (report: Report) => {
    if (!canApprove || report.approval_status !== "approved") return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Generate SHA-256 hash of content
      const contentHash = await generateContentHash(report.content_markdown);

      const { error } = await supabase
        .from("reports")
        .update({
          is_published: true,
          published_at: new Date().toISOString(),
          content_hash: contentHash,
        })
        .eq("id", report.id);

      if (error) throw error;
    } catch (error) {
      console.error("Error publishing report:", error);
      alert("Failed to publish report");
    }
  };

  // Download report as markdown
  const handleDownloadMarkdown = (report: Report) => {
    const blob = new Blob([report.content_markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.title.replace(/\s+/g, "_")}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Delete report
  const handleDeleteReport = async (reportId: string) => {
    if (!confirm("Are you sure you want to delete this report?")) return;

    const { error } = await supabase
      .from("reports")
      .delete()
      .eq("id", reportId);

    if (error) {
      console.error("Error deleting report:", error);
      alert("Failed to delete report");
    }
  };

  // Helper functions
  const getWeekStart = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const getReportIcon = (type: string) => {
    if (type === "weekly_summary") return <Calendar className="h-5 w-5" />;
    if (type === "monthly_summary") return <BarChart className="h-5 w-5" />;
    return <FileText className="h-5 w-5" />;
  };

  const getReportTypeName = (type: string) => {
    if (type === "weekly_summary") return "Weekly Summary";
    if (type === "monthly_summary") return "Monthly Summary";
    return "Custom Report";
  };

  const getStatusLabel = (status: string | null) => {
    if (!status) return "Draft";
    return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Filter reports
  const filteredReports = reports.filter((report) => {
    if (filter === "all") return true;
    if (filter === "published") return report.is_published === true;
    return report.approval_status === filter;
  });

  if (!currentOrg) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">
          Please select an organization to view reports
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground mt-1">
            Generate and manage executive summaries with approval workflow
          </p>
          <RoleBadge />
        </div>
        <PermissionGuard require="create">
          <Button onClick={() => setShowGenerateDialog(true)} size="icon" className="h-9 w-9" aria-label="Generate report">
            <TrendingUp className="h-4 w-4" />
          </Button>
        </PermissionGuard>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          All
        </Button>
        <Button
          variant={filter === "draft" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("draft")}
        >
          Drafts
        </Button>
        <Button
          variant={filter === "pending_approval" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("pending_approval")}
        >
          Pending
        </Button>
        <Button
          variant={filter === "approved" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("approved")}
        >
          Approved
        </Button>
        <Button
          variant={filter === "published" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("published")}
        >
          <Lock className="h-3 w-3 mr-1" />
          Published
        </Button>
      </div>

      {/* Report Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredReports.map((report) => (
          <div
            key={report.id}
            className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
              report.is_published ? "border-primary/50 bg-primary/5" : ""
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 flex-1">
                {getReportIcon(report.type)}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate">{report.title}</h3>
                    {report.is_published && (
                      <Shield className="h-4 w-4 text-primary flex-shrink-0" title="Published (Immutable)" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {getReportTypeName(report.type)}
                  </p>
                </div>
              </div>
            </div>

            {/* Status Badge */}
            <div className="mb-3">
              <Badge
                variant="outline"
                className={STATUS_COLORS[report.approval_status as keyof typeof STATUS_COLORS] || "bg-gray-100"}
              >
                {getStatusLabel(report.approval_status)}
              </Badge>
            </div>

            <div className="text-sm text-muted-foreground mb-4">
              <p>
                Period: {new Date(report.period_start).toLocaleDateString()} -{" "}
                {new Date(report.period_end).toLocaleDateString()}
              </p>
              <p>
                Created: {new Date(report.created_at).toLocaleDateString()}
              </p>
              {report.published_at && (
                <p className="text-primary">
                  Published: {new Date(report.published_at).toLocaleDateString()}
                </p>
              )}
            </div>

            {/* Quick Stats */}
            {report.stats && (
              <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                <div className="bg-gray-50 p-2 rounded">
                  <p className="text-muted-foreground">Tasks</p>
                  <p className="font-semibold">{report.stats.tasks?.total || 0}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <p className="text-muted-foreground">Risks</p>
                  <p className="font-semibold">{report.stats.risks?.total || 0}</p>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDownloadMarkdown(report)}
                className="flex-1"
              >
                <Download className="mr-1 h-3 w-3" />
                Download
              </Button>

              {!report.is_published && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline">
                      Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {/* Submit for approval (creator only, draft status) */}
                    {report.approval_status === "draft" && canEdit && (
                      <DropdownMenuItem onClick={() => handleSubmitForApproval(report)}>
                        <Send className="mr-2 h-4 w-4" />
                        Submit for Approval
                      </DropdownMenuItem>
                    )}

                    {/* Approve (admin/owner only, pending status) */}
                    {report.approval_status === "pending_approval" && canApprove && (
                      <>
                        <DropdownMenuItem onClick={() => handleApprove(report)}>
                          <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                          Approve
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedReport(report);
                            setShowRejectDialog(true);
                          }}
                        >
                          <XCircle className="mr-2 h-4 w-4 text-red-600" />
                          Reject
                        </DropdownMenuItem>
                      </>
                    )}

                    {/* Publish (admin/owner only, approved status) */}
                    {report.approval_status === "approved" && !report.is_published && canApprove && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handlePublish(report)}>
                          <Lock className="mr-2 h-4 w-4 text-primary" />
                          Publish (Immutable)
                        </DropdownMenuItem>
                      </>
                    )}

                    {/* Delete (if not published) */}
                    {canDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteReport(report.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Published indicator with hash */}
            {report.is_published && report.content_hash && (
              <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  <span className="font-mono truncate" title={report.content_hash}>
                    {report.content_hash.substring(0, 16)}...
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredReports.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No reports{filter !== "all" ? ` in ${filter}` : ""}</h3>
          <p className="text-muted-foreground mb-4">
            {filter === "all"
              ? "Generate your first executive summary to get started"
              : `No reports with ${filter} status`}
          </p>
          {filter === "all" && (
            <Button onClick={() => setShowGenerateDialog(true)}>
              Generate Report
            </Button>
          )}
        </div>
      )}

      {/* Generate Report Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Generate Report</DialogTitle>
            <DialogDescription>
              Create an executive summary with analytics and insights
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto flex-1 px-1">
            <div className="space-y-2">
              <Label htmlFor="report-type">Report Type</Label>
              <Select
                value={reportType}
                onValueChange={(value: any) => setReportType(value)}
              >
                <SelectTrigger id="report-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly_summary">Weekly Summary</SelectItem>
                  <SelectItem value="monthly_summary">Monthly Summary</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {reportType === "weekly_summary"
                  ? "A comprehensive weekly overview of tasks, milestones, risks, and decisions"
                  : "A detailed monthly roll-up with trends and key metrics"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="period">Period</Label>
              <Select
                value={selectedPeriod}
                onValueChange={setSelectedPeriod}
              >
                <SelectTrigger id="period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">
                    Current {reportType === "weekly_summary" ? "Week" : "Month"}
                  </SelectItem>
                  <SelectItem value="previous">
                    Previous {reportType === "weekly_summary" ? "Week" : "Month"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-muted border border-border rounded-lg p-3 text-sm">
              <p className="font-medium text-foreground mb-1">Report will include:</p>
              <ul className="text-muted-foreground space-y-1 ml-4 list-disc">
                <li>Executive overview with key metrics</li>
                <li>Task completion status and progress</li>
                <li>Milestone tracking and deadlines</li>
                <li>Risk analysis and mitigation status</li>
                <li>Recent decisions and rationale</li>
                <li>Recommended actions</li>
              </ul>
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground">
                  Report will be created in DRAFT status. Submit for approval when ready.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setShowGenerateDialog(false)}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button onClick={handleGenerateReport} disabled={isGenerating}>
              {isGenerating ? "Generating..." : "Generate Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Reject Report</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this report
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto flex-1 px-1">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Rejection Reason</Label>
              <Textarea
                id="rejection-reason"
                rows={4}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this report is being rejected and what needs to be addressed..."
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectionReason("");
                setSelectedReport(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim()}
            >
              Reject Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
