"use client";

import { useCopilotAction } from "@copilotkit/react-core";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/organization-context";
import { ReportGenerator } from "@/lib/services/report-generator";

/**
 * CopilotKit actions for report generation
 */
export function useReportActions() {
  const { currentOrg } = useOrganization();
  const supabase = createClient();
  const reportGenerator = new ReportGenerator();

  // Generate Weekly Summary
  useCopilotAction({
    name: "generateWeeklySummary",
    description:
      "Generate a comprehensive weekly executive summary report for the current organization. Includes tasks, milestones, risks, decisions, and recommended actions.",
    parameters: [
      {
        name: "weekOffset",
        type: "number",
        description:
          "Week offset from current week. 0 = current week, -1 = last week, -2 = two weeks ago, etc.",
        required: false,
      },
    ],
    handler: async ({ weekOffset = 0 }) => {
      if (!currentOrg) {
        return "Please select an organization first";
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        // Calculate week start
        const weekStart = getWeekStart(new Date());
        weekStart.setDate(weekStart.getDate() + weekOffset * 7);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        // Generate markdown content
        const contentMarkdown = await reportGenerator.generateWeeklySummary(
          currentOrg.id,
          currentOrg.name,
          weekStart
        );

        // Gather stats
        const stats = await reportGenerator.gatherStats(
          currentOrg.id,
          weekStart,
          weekEnd
        );

        // Save to database
        const { data, error } = await supabase
          .from("reports")
          .insert({
            org_id: currentOrg.id,
            title: `Weekly Summary - ${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
            type: "weekly_summary",
            period_start: weekStart.toISOString(),
            period_end: weekEnd.toISOString(),
            content_markdown: contentMarkdown,
            stats,
            created_by: user.id,
          } as any)
          .select()
          .single();

        if (error) throw error;

        return `Weekly summary report generated successfully! The report covers ${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()} and includes:\n\n- ${stats.tasks.total} tasks (${stats.tasks.completed} completed)\n- ${stats.milestones.total} milestones\n- ${stats.risks.total} risks (${stats.risks.critical} critical)\n- ${stats.decisions.recent} decisions made this week\n\nYou can download the report from the Reports page.`;
      } catch (error) {
        console.error("Error generating weekly summary:", error);
        return `Failed to generate weekly summary: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    },
  });

  // Generate Monthly Summary
  useCopilotAction({
    name: "generateMonthlySummary",
    description:
      "Generate a comprehensive monthly executive summary report for the current organization. Includes detailed analytics, trends, and monthly roll-ups.",
    parameters: [
      {
        name: "monthOffset",
        type: "number",
        description:
          "Month offset from current month. 0 = current month, -1 = last month, -2 = two months ago, etc.",
        required: false,
      },
    ],
    handler: async ({ monthOffset = 0 }) => {
      if (!currentOrg) {
        return "Please select an organization first";
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        // Calculate month
        const now = new Date();
        const targetMonth = new Date(
          now.getFullYear(),
          now.getMonth() + monthOffset,
          1
        );
        const monthStart = new Date(
          targetMonth.getFullYear(),
          targetMonth.getMonth(),
          1
        );
        const monthEnd = new Date(
          targetMonth.getFullYear(),
          targetMonth.getMonth() + 1,
          0
        );

        // Generate markdown content
        const contentMarkdown = await reportGenerator.generateMonthlySummary(
          currentOrg.id,
          currentOrg.name,
          targetMonth
        );

        // Gather stats
        const stats = await reportGenerator.gatherStats(
          currentOrg.id,
          monthStart,
          monthEnd
        );

        // Save to database
        const { data, error } = await supabase
          .from("reports")
          .insert({
            org_id: currentOrg.id,
            title: `Monthly Summary - ${targetMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`,
            type: "monthly_summary",
            period_start: monthStart.toISOString(),
            period_end: monthEnd.toISOString(),
            content_markdown: contentMarkdown,
            stats,
            created_by: user.id,
          } as any)
          .select()
          .single();

        if (error) throw error;

        const taskCompletionRate =
          stats.tasks.total > 0
            ? Math.round((stats.tasks.completed / stats.tasks.total) * 100)
            : 0;
        const milestoneProgress =
          stats.milestones.total > 0
            ? Math.round(
                (stats.milestones.completed / stats.milestones.total) * 100
              )
            : 0;

        return `Monthly summary report generated successfully for ${targetMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}!\n\nKey metrics:\n- Task Completion Rate: ${taskCompletionRate}%\n- Milestone Progress: ${milestoneProgress}%\n- Total Tasks: ${stats.tasks.total}\n- Total Risks: ${stats.risks.total}\n- Decisions Made: ${stats.decisions.recent}\n\nYou can download the report from the Reports page.`;
      } catch (error) {
        console.error("Error generating monthly summary:", error);
        return `Failed to generate monthly summary: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    },
  });

  // List Reports
  useCopilotAction({
    name: "listReports",
    description:
      "List all generated reports for the current organization, showing titles, types, and dates.",
    parameters: [],
    handler: async () => {
      if (!currentOrg) {
        return "Please select an organization first";
      }

      try {
        const { data: reports, error } = await supabase
          .from("reports")
          .select("id, title, type, period_start, period_end, created_at")
          .eq("org_id", currentOrg.id)
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) throw error;

        if (!reports || reports.length === 0) {
          return "No reports have been generated yet. You can generate a weekly or monthly summary report.";
        }

        let response = `Found ${reports.length} report(s) for ${currentOrg.name}:\n\n`;
        reports.forEach((report: any, index: number) => {
          const createdDate = new Date(report.created_at).toLocaleDateString();
          const periodStart = new Date(report.period_start).toLocaleDateString();
          const periodEnd = new Date(report.period_end).toLocaleDateString();
          const reportType =
            report.type === "weekly_summary"
              ? "Weekly Summary"
              : report.type === "monthly_summary"
                ? "Monthly Summary"
                : "Custom Report";

          response += `${index + 1}. ${report.title}\n`;
          response += `   Type: ${reportType}\n`;
          response += `   Period: ${periodStart} - ${periodEnd}\n`;
          response += `   Created: ${createdDate}\n\n`;
        });

        response +=
          "You can view and download these reports from the Reports page.";
        return response;
      } catch (error) {
        console.error("Error listing reports:", error);
        return `Failed to list reports: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    },
  });
}

// Helper function
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  return new Date(d.setDate(diff));
}
