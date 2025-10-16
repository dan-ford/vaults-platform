"use client";

import { useCopilotReadable } from "@copilotkit/react-core";
import { CheckSquare, AlertTriangle, FileCheck, Activity } from "lucide-react";
import { useDashboardData } from "@/lib/hooks/use-dashboard-data";
import { StatCard } from "@/components/dashboard/stat-card";
import { TaskDistributionChart } from "@/components/dashboard/task-distribution-chart";
import { RiskMatrix } from "@/components/dashboard/risk-matrix";
import { ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { MilestonesProgress } from "@/components/dashboard/milestones-progress";

export default function DashboardPage() {
  const { stats, isLoading } = useDashboardData();

  // Make dashboard stats readable to AI
  useCopilotReadable({
    description: "Dashboard statistics and metrics for the current organization",
    value: stats,
  });

  if (isLoading || !stats) {
    return (
      <div className="container-xl space-y-5 pb-20">
        <header className="flex items-start justify-between pb-3 border-b border-gray-200">
          <div className="space-y-0.5">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Overview of your vault and activities</p>
          </div>
        </header>

        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-xl space-y-6 pb-20">
      {/* Header */}
      <header className="flex items-start justify-between pb-3 border-b border-gray-200 animate-fade-in">
        <div className="space-y-0.5">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of your vault and activities</p>
        </div>
      </header>

      {/* Overview Stats - Top Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Tasks"
          value={stats.tasks.in_progress}
          subtitle={`${stats.tasks.total} total tasks`}
          icon={CheckSquare}
          iconColor="text-primary"
        />

        <StatCard
          title="Critical Risks"
          value={stats.risks.critical + stats.risks.high}
          subtitle={`${stats.risks.total} total risks`}
          icon={AlertTriangle}
          iconColor="text-destructive"
        />

        <StatCard
          title="Pending Decisions"
          value={stats.decisions.pending}
          subtitle={`${stats.decisions.total} total decisions`}
          icon={FileCheck}
          iconColor="text-primary"
        />

        <StatCard
          title="Recent Activity"
          value={stats.recentActivity.length}
          subtitle="Last 24 hours"
          icon={Activity}
          iconColor="text-primary"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TaskDistributionChart
          data={{
            todo: stats.tasks.todo,
            in_progress: stats.tasks.in_progress,
            blocked: stats.tasks.blocked,
            done: stats.tasks.done,
          }}
        />

        <RiskMatrix />
      </div>

      {/* Activity and Milestones Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityTimeline activities={stats.recentActivity} />

        <MilestonesProgress />
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
        <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Documents</p>
              <p className="text-2xl font-bold text-foreground">{stats.documents.total}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.documents.thisWeek} uploaded this week
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Contacts</p>
              <p className="text-2xl font-bold text-foreground">{stats.contacts.active}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.contacts.total} total contacts
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Milestones</p>
              <p className="text-2xl font-bold text-foreground">{stats.milestones.in_progress}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.milestones.completed} completed
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
