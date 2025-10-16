/**
 * Report Generation Service
 *
 * Generates executive summaries and reports in Markdown format
 * from organizational data (tasks, milestones, risks, decisions, contacts)
 */

import { createClient } from "@/lib/supabase/client";

export interface ReportStats {
  tasks: {
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    completed: number;
    overdue: number;
  };
  milestones: {
    total: number;
    byStatus: Record<string, number>;
    completed: number;
    upcoming: number;
  };
  risks: {
    total: number;
    byImpact: Record<string, number>;
    byProbability: Record<string, number>;
    byStatus: Record<string, number>;
    critical: number;
  };
  decisions: {
    total: number;
    byStatus: Record<string, number>;
    recent: number;
  };
  contacts: {
    total: number;
    byType: Record<string, number>;
    active: number;
  };
  documents: {
    total: number;
    byCategory: Record<string, number>;
    recentlyAdded: number;
  };
}

export interface ReportData {
  orgId: string;
  orgName: string;
  periodStart: Date;
  periodEnd: Date;
  stats: ReportStats;
  tasks: any[];
  milestones: any[];
  risks: any[];
  decisions: any[];
}

export class ReportGenerator {
  private supabase = createClient();

  /**
   * Gather statistics for a given organization and time period
   */
  async gatherStats(
    orgId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<ReportStats> {
    // Tasks statistics
    const { data: allTasks } = await this.supabase
      .from("tasks")
      .select("*")
      .eq("org_id", orgId);

    const tasks = {
      total: allTasks?.length || 0,
      byStatus: this.groupBy(allTasks || [], "status"),
      byPriority: this.groupBy(allTasks || [], "priority"),
      completed: allTasks?.filter((t: any) => t.status === "done").length || 0,
      overdue:
        allTasks?.filter(
          (t: any) =>
            t.due_date &&
            new Date(t.due_date) < new Date() &&
            t.status !== "done"
        ).length || 0,
    };

    // Milestones statistics
    const { data: allMilestones } = await this.supabase
      .from("milestones")
      .select("*")
      .eq("org_id", orgId);

    const milestones = {
      total: allMilestones?.length || 0,
      byStatus: this.groupBy(allMilestones || [], "status"),
      completed:
        allMilestones?.filter((m: any) => m.status === "completed").length || 0,
      upcoming:
        allMilestones?.filter(
          (m: any) =>
            m.target_date &&
            new Date(m.target_date) > new Date() &&
            m.status !== "completed"
        ).length || 0,
    };

    // Risks statistics
    const { data: allRisks } = await this.supabase
      .from("risks")
      .select("*")
      .eq("org_id", orgId);

    const risks = {
      total: allRisks?.length || 0,
      byImpact: this.groupBy(allRisks || [], "impact"),
      byProbability: this.groupBy(allRisks || [], "probability"),
      byStatus: this.groupBy(allRisks || [], "status"),
      critical:
        allRisks?.filter(
          (r: any) => r.impact === "critical" && r.status !== "mitigated"
        ).length || 0,
    };

    // Decisions statistics
    const { data: allDecisions } = await this.supabase
      .from("decisions")
      .select("*")
      .eq("org_id", orgId);

    const recentDecisions = allDecisions?.filter(
      (d: any) =>
        new Date(d.decided_at) >= periodStart &&
        new Date(d.decided_at) <= periodEnd
    );

    const decisions = {
      total: allDecisions?.length || 0,
      byStatus: this.groupBy(allDecisions || [], "status"),
      recent: recentDecisions?.length || 0,
    };

    // Contacts statistics
    const { data: allContacts } = await this.supabase
      .from("contacts")
      .select("*")
      .eq("org_id", orgId);

    const contacts = {
      total: allContacts?.length || 0,
      byType: this.groupBy(allContacts || [], "type"),
      active: allContacts?.filter((c: any) => c.status === "active").length || 0,
    };

    // Documents statistics
    const { data: allDocuments } = await this.supabase
      .from("documents")
      .select("*")
      .eq("org_id", orgId);

    const recentDocuments = allDocuments?.filter(
      (d: any) =>
        new Date(d.created_at) >= periodStart &&
        new Date(d.created_at) <= periodEnd
    );

    const documents = {
      total: allDocuments?.length || 0,
      byCategory: this.groupBy(allDocuments || [], "category"),
      recentlyAdded: recentDocuments?.length || 0,
    };

    return { tasks, milestones, risks, decisions, contacts, documents };
  }

  /**
   * Gather detailed data for report
   */
  async gatherReportData(
    orgId: string,
    orgName: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<ReportData> {
    const stats = await this.gatherStats(orgId, periodStart, periodEnd);

    // Get period-specific tasks
    const { data: tasks } = await this.supabase
      .from("tasks")
      .select("*")
      .eq("org_id", orgId)
      .gte("updated_at", periodStart.toISOString())
      .lte("updated_at", periodEnd.toISOString())
      .order("updated_at", { ascending: false });

    // Get period-specific milestones
    const { data: milestones } = await this.supabase
      .from("milestones")
      .select("*")
      .eq("org_id", orgId)
      .or(
        `updated_at.gte.${periodStart.toISOString()},target_date.gte.${periodStart.toISOString()}`
      )
      .order("target_date", { ascending: true });

    // Get active risks
    const { data: risks } = await this.supabase
      .from("risks")
      .select("*")
      .eq("org_id", orgId)
      .neq("status", "mitigated")
      .order("impact", { ascending: false });

    // Get period-specific decisions
    const { data: decisions } = await this.supabase
      .from("decisions")
      .select("*")
      .eq("org_id", orgId)
      .gte("decided_at", periodStart.toISOString())
      .lte("decided_at", periodEnd.toISOString())
      .order("decided_at", { ascending: false });

    return {
      orgId,
      orgName,
      periodStart,
      periodEnd,
      stats,
      tasks: tasks || [],
      milestones: milestones || [],
      risks: risks || [],
      decisions: decisions || [],
    };
  }

  /**
   * Generate weekly executive summary
   */
  async generateWeeklySummary(
    orgId: string,
    orgName: string,
    weekStart?: Date
  ): Promise<string> {
    const start = weekStart || this.getWeekStart(new Date());
    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    const data = await this.gatherReportData(orgId, orgName, start, end);

    return this.generateWeeklySummaryMarkdown(data);
  }

  /**
   * Generate monthly executive summary
   */
  async generateMonthlySummary(
    orgId: string,
    orgName: string,
    month?: Date
  ): Promise<string> {
    const referenceDate = month || new Date();
    const start = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      1
    );
    const end = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth() + 1,
      0
    );

    const data = await this.gatherReportData(orgId, orgName, start, end);

    return this.generateMonthlySummaryMarkdown(data);
  }

  /**
   * Generate weekly summary markdown
   */
  private generateWeeklySummaryMarkdown(data: ReportData): string {
    const { orgName, periodStart, periodEnd, stats, tasks, milestones, risks, decisions } = data;

    const formatDate = (date: Date) =>
      date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

    let md = `# Weekly Executive Summary\n\n`;
    md += `**${orgName}**\n\n`;
    md += `**Period:** ${formatDate(periodStart)} - ${formatDate(periodEnd)}\n\n`;
    md += `**Generated:** ${formatDate(new Date())}\n\n`;
    md += `---\n\n`;

    // Executive Overview
    md += `## Executive Overview\n\n`;
    md += `### Key Metrics\n\n`;
    md += `| Metric | Count | Status |\n`;
    md += `|--------|-------|--------|\n`;
    md += `| Active Tasks | ${stats.tasks.total - stats.tasks.completed} | ${this.getTasksHealth(stats.tasks)} |\n`;
    md += `| Completed Tasks | ${stats.tasks.completed} | ✅ |\n`;
    md += `| Overdue Tasks | ${stats.tasks.overdue} | ${stats.tasks.overdue > 0 ? "⚠️" : "✅"} |\n`;
    md += `| Active Milestones | ${stats.milestones.total - stats.milestones.completed} | ${this.getMilestonesHealth(stats.milestones)} |\n`;
    md += `| Critical Risks | ${stats.risks.critical} | ${stats.risks.critical > 0 ? "🚨" : "✅"} |\n`;
    md += `| Recent Decisions | ${decisions.length} | 📋 |\n\n`;

    // Tasks Section
    if (tasks.length > 0) {
      md += `## Tasks This Week\n\n`;
      md += `**Total Activity:** ${tasks.length} tasks updated\n\n`;

      const completedTasks = tasks.filter((t) => t.status === "done");
      if (completedTasks.length > 0) {
        md += `### ✅ Completed (${completedTasks.length})\n\n`;
        completedTasks.slice(0, 10).forEach((task) => {
          md += `- **${task.title}**\n`;
          if (task.description) {
            md += `  ${task.description.substring(0, 100)}${task.description.length > 100 ? "..." : ""}\n`;
          }
        });
        md += `\n`;
      }

      const inProgressTasks = tasks.filter((t) => t.status === "in_progress");
      if (inProgressTasks.length > 0) {
        md += `### 🔄 In Progress (${inProgressTasks.length})\n\n`;
        inProgressTasks.slice(0, 10).forEach((task) => {
          md += `- **${task.title}**`;
          if (task.priority === "urgent" || task.priority === "high") {
            md += ` [${task.priority.toUpperCase()}]`;
          }
          md += `\n`;
        });
        md += `\n`;
      }

      const blockedTasks = tasks.filter((t) => t.status === "blocked");
      if (blockedTasks.length > 0) {
        md += `### 🚫 Blocked (${blockedTasks.length})\n\n`;
        blockedTasks.forEach((task) => {
          md += `- **${task.title}** ⚠️\n`;
        });
        md += `\n`;
      }
    }

    // Milestones Section
    if (milestones.length > 0) {
      md += `## Milestones\n\n`;

      const upcomingMilestones = milestones.filter(
        (m) => m.status !== "completed" && m.status !== "cancelled"
      );
      if (upcomingMilestones.length > 0) {
        md += `### Upcoming\n\n`;
        upcomingMilestones.slice(0, 5).forEach((milestone) => {
          const targetDate = milestone.target_date
            ? formatDate(new Date(milestone.target_date))
            : "No date set";
          md += `- **${milestone.name}** - Target: ${targetDate}\n`;
          if (milestone.description) {
            md += `  ${milestone.description.substring(0, 100)}${milestone.description.length > 100 ? "..." : ""}\n`;
          }
        });
        md += `\n`;
      }

      const completedMilestones = milestones.filter(
        (m) => m.status === "completed"
      );
      if (completedMilestones.length > 0) {
        md += `### ✅ Recently Completed\n\n`;
        completedMilestones.forEach((milestone) => {
          md += `- **${milestone.name}**\n`;
        });
        md += `\n`;
      }
    }

    // Risks Section
    if (risks.length > 0) {
      md += `## Active Risks\n\n`;

      const criticalRisks = risks.filter((r) => r.impact === "critical");
      if (criticalRisks.length > 0) {
        md += `### 🚨 Critical\n\n`;
        criticalRisks.forEach((risk) => {
          md += `- **${risk.title}** (${risk.probability} probability)\n`;
          if (risk.mitigation_plan) {
            md += `  *Mitigation:* ${risk.mitigation_plan.substring(0, 150)}${risk.mitigation_plan.length > 150 ? "..." : ""}\n`;
          }
        });
        md += `\n`;
      }

      const highRisks = risks.filter((r) => r.impact === "high");
      if (highRisks.length > 0) {
        md += `### ⚠️ High Impact\n\n`;
        highRisks.slice(0, 5).forEach((risk) => {
          md += `- **${risk.title}** (${risk.probability} probability)\n`;
        });
        md += `\n`;
      }
    }

    // Decisions Section
    if (decisions.length > 0) {
      md += `## Decisions Made\n\n`;
      decisions.forEach((decision) => {
        const decidedDate = formatDate(new Date(decision.decided_at));
        md += `### ${decision.title}\n\n`;
        md += `**Date:** ${decidedDate} | **Status:** ${decision.status}\n\n`;
        if (decision.decision) {
          md += `**Decision:** ${decision.decision}\n\n`;
        }
        if (decision.rationale) {
          md += `**Rationale:** ${decision.rationale.substring(0, 200)}${decision.rationale.length > 200 ? "..." : ""}\n\n`;
        }
      });
    }

    // Action Items
    md += `## Recommended Actions\n\n`;
    if (stats.tasks.overdue > 0) {
      md += `- ⚠️ Address ${stats.tasks.overdue} overdue task(s)\n`;
    }
    if (stats.risks.critical > 0) {
      md += `- 🚨 Review and mitigate ${stats.risks.critical} critical risk(s)\n`;
    }
    if (tasks.filter((t) => t.status === "blocked").length > 0) {
      md += `- 🚫 Unblock ${tasks.filter((t) => t.status === "blocked").length} blocked task(s)\n`;
    }
    if (
      stats.milestones.upcoming > 0 &&
      stats.milestones.upcoming <= 3
    ) {
      md += `- 📅 ${stats.milestones.upcoming} milestone(s) approaching\n`;
    }
    md += `\n`;

    md += `---\n\n`;
    md += `*This report was automatically generated by Level Ops*\n`;

    return md;
  }

  /**
   * Generate monthly summary markdown
   */
  private generateMonthlySummaryMarkdown(data: ReportData): string {
    const { orgName, periodStart, periodEnd, stats, tasks, milestones, risks, decisions } = data;

    const monthName = periodStart.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    let md = `# Monthly Executive Summary\n\n`;
    md += `**${orgName}**\n\n`;
    md += `**Period:** ${monthName}\n\n`;
    md += `**Generated:** ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}\n\n`;
    md += `---\n\n`;

    // Executive Summary
    md += `## Executive Summary\n\n`;
    md += `### Overall Health\n\n`;
    md += `| Category | Total | Completed | In Progress | Health |\n`;
    md += `|----------|-------|-----------|-------------|--------|\n`;
    md += `| Tasks | ${stats.tasks.total} | ${stats.tasks.completed} | ${(stats.tasks.byStatus.in_progress || 0)} | ${this.getTasksHealth(stats.tasks)} |\n`;
    md += `| Milestones | ${stats.milestones.total} | ${stats.milestones.completed} | ${stats.milestones.total - stats.milestones.completed} | ${this.getMilestonesHealth(stats.milestones)} |\n`;
    md += `| Risks | ${stats.risks.total} | ${(stats.risks.byStatus.mitigated || 0)} | ${stats.risks.total - (stats.risks.byStatus.mitigated || 0)} | ${stats.risks.critical > 0 ? "⚠️" : "✅"} |\n`;
    md += `| Decisions | ${stats.decisions.total} | ${stats.decisions.recent} this month | - | 📋 |\n\n`;

    // Tasks Breakdown
    md += `## Tasks\n\n`;
    md += `### Status Distribution\n\n`;
    Object.entries(stats.tasks.byStatus).forEach(([status, count]) => {
      md += `- **${this.formatStatus(status)}:** ${count}\n`;
    });
    md += `\n### Priority Distribution\n\n`;
    Object.entries(stats.tasks.byPriority).forEach(([priority, count]) => {
      md += `- **${this.formatPriority(priority)}:** ${count}\n`;
    });
    md += `\n`;

    if (tasks.length > 0) {
      md += `### Notable Completions\n\n`;
      tasks
        .filter((t) => t.status === "done")
        .slice(0, 10)
        .forEach((task) => {
          md += `- ${task.title}\n`;
        });
      md += `\n`;
    }

    // Milestones Summary
    md += `## Milestones\n\n`;
    if (milestones.length > 0) {
      const completed = milestones.filter((m) => m.status === "completed");
      const active = milestones.filter((m) => m.status === "active");
      const planning = milestones.filter((m) => m.status === "planning");

      if (completed.length > 0) {
        md += `### ✅ Completed (${completed.length})\n\n`;
        completed.forEach((m) => {
          md += `- **${m.name}**\n`;
        });
        md += `\n`;
      }

      if (active.length > 0) {
        md += `### 🔄 Active (${active.length})\n\n`;
        active.forEach((m) => {
          const targetDate = m.target_date
            ? new Date(m.target_date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            : "TBD";
          md += `- **${m.name}** - Target: ${targetDate}\n`;
        });
        md += `\n`;
      }

      if (planning.length > 0) {
        md += `### 📋 Planning (${planning.length})\n\n`;
        planning.forEach((m) => {
          md += `- ${m.name}\n`;
        });
        md += `\n`;
      }
    }

    // Risks Summary
    md += `## Risk Management\n\n`;
    md += `### Risk Matrix\n\n`;
    md += `| Impact | Count | Status |\n`;
    md += `|--------|-------|--------|\n`;
    ["critical", "high", "medium", "low"].forEach((impact) => {
      const count = stats.risks.byImpact[impact] || 0;
      if (count > 0) {
        md += `| ${this.formatImpact(impact)} | ${count} | ${impact === "critical" ? "🚨" : impact === "high" ? "⚠️" : "ℹ️"} |\n`;
      }
    });
    md += `\n`;

    if (risks.length > 0) {
      md += `### Top Risks Requiring Attention\n\n`;
      risks.slice(0, 5).forEach((risk) => {
        md += `- **${risk.title}** (${risk.impact} impact, ${risk.probability} probability)\n`;
      });
      md += `\n`;
    }

    // Decisions Summary
    if (decisions.length > 0) {
      md += `## Key Decisions\n\n`;
      decisions.forEach((decision) => {
        md += `### ${decision.title}\n\n`;
        if (decision.decision) {
          md += `${decision.decision}\n\n`;
        }
      });
    }

    // Monthly Trends
    md += `## Metrics & Trends\n\n`;
    md += `- **Task Completion Rate:** ${stats.tasks.total > 0 ? Math.round((stats.tasks.completed / stats.tasks.total) * 100) : 0}%\n`;
    md += `- **Milestone Progress:** ${stats.milestones.total > 0 ? Math.round((stats.milestones.completed / stats.milestones.total) * 100) : 0}%\n`;
    md += `- **Risk Mitigation:** ${stats.risks.total > 0 ? Math.round(((stats.risks.byStatus.mitigated || 0) / stats.risks.total) * 100) : 0}%\n`;
    md += `- **Active Team Members:** ${stats.contacts.active}\n`;
    md += `- **Documents Added:** ${stats.documents.recentlyAdded}\n`;
    md += `\n`;

    md += `---\n\n`;
    md += `*This report was automatically generated by Level Ops*\n`;

    return md;
  }

  // Helper methods
  private groupBy(array: any[], key: string): Record<string, number> {
    return array.reduce((acc, item) => {
      const value = item[key] || "unknown";
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
    return new Date(d.setDate(diff));
  }

  private getTasksHealth(tasks: ReportStats["tasks"]): string {
    if (tasks.overdue > 5) return "🚨";
    if (tasks.overdue > 0) return "⚠️";
    return "✅";
  }

  private getMilestonesHealth(milestones: ReportStats["milestones"]): string {
    const completionRate =
      milestones.total > 0 ? milestones.completed / milestones.total : 0;
    if (completionRate >= 0.8) return "✅";
    if (completionRate >= 0.5) return "⚠️";
    return "🚨";
  }

  private formatStatus(status: string): string {
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  private formatPriority(priority: string): string {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  }

  private formatImpact(impact: string): string {
    return impact.charAt(0).toUpperCase() + impact.slice(1);
  }
}
