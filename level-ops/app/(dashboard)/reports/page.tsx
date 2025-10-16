"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/organization-context";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { PermissionGuard, RoleBadge } from "@/components/permissions";
import { ReportGenerator } from "@/lib/services/report-generator";
import { FileText, Download, Trash2, Calendar, TrendingUp, BarChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Report {
  id: string;
  title: string;
  type: "weekly_summary" | "monthly_summary" | "custom";
  period_start: string;
  period_end: string;
  content_markdown: string;
  stats: any;
  created_at: string;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [reportType, setReportType] = useState<"weekly_summary" | "monthly_summary">("weekly_summary");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("current");

  const { currentOrg } = useOrganization();
  const { hasPermission, role, canEdit, canDelete, isViewer } = usePermissions();
  const supabase = createClient();
  const reportGenerator = new ReportGenerator();

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
          if (payload.eventType === "INSERT") {
            setReports((prev) => [payload.new as Report, ...prev]);
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

      // Save to database
      const { error } = await supabase.from("reports").insert({
        org_id: currentOrg.id,
        title,
        type: reportType,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        content_markdown: contentMarkdown,
        stats,
        created_by: user.id,
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
            Generate and manage executive summaries and analytics reports
          </p>
          <RoleBadge />
        </div>
        <PermissionGuard require="create">
          <Button onClick={() => setShowGenerateDialog(true)} size="icon" className="h-9 w-9" aria-label="Generate report">
            <TrendingUp className="h-4 w-4" />
          </Button>
        </PermissionGuard>
      </div>

      {/* Report Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <div
            key={report.id}
            className="border rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {getReportIcon(report.type)}
                <div>
                  <h3 className="font-semibold">{report.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {getReportTypeName(report.type)}
                  </p>
                </div>
              </div>
            </div>

            <div className="text-sm text-muted-foreground mb-4">
              <p>
                Period: {new Date(report.period_start).toLocaleDateString()} -{" "}
                {new Date(report.period_end).toLocaleDateString()}
              </p>
              <p>
                Created: {new Date(report.created_at).toLocaleDateString()}
              </p>
            </div>

            {/* Quick Stats */}
            {report.stats && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4 text-xs">
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
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDeleteReport(report.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {reports.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No reports yet</h3>
          <p className="text-muted-foreground mb-4">
            Generate your first executive summary to get started
          </p>
          <Button onClick={() => setShowGenerateDialog(true)}>
            Generate Report
          </Button>
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
    </div>
  );
}
