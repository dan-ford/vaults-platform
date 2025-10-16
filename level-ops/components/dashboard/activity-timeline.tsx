"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, CheckSquare, AlertTriangle, Users, FileCheck, Target, Bot, User } from "lucide-react";

interface Activity {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  actor_type: string;
  created_at: string;
  metadata: any;
}

interface ActivityTimelineProps {
  activities: Activity[];
}

const RESOURCE_ICONS = {
  task: CheckSquare,
  risk: AlertTriangle,
  decision: FileCheck,
  document: FileText,
  contact: Users,
  milestone: Target,
};

const ACTION_LABELS: Record<string, string> = {
  create: 'created',
  update: 'updated',
  delete: 'deleted',
  upload: 'uploaded',
};

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <Card className="p-6 h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">No recent activity</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 animate-fade-in">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
        <p className="text-sm text-muted-foreground">Latest actions in your vault</p>
      </div>

      <div className="space-y-4">
        {activities.map((activity, index) => {
          const Icon = RESOURCE_ICONS[activity.resource_type as keyof typeof RESOURCE_ICONS] || FileText;
          const isAI = activity.actor_type === 'agent' || activity.actor_type === 'ai_assistant';
          const actionLabel = ACTION_LABELS[activity.action] || activity.action;

          return (
            <div
              key={activity.id}
              className="flex items-start gap-3 pb-4 last:pb-0 border-b border-gray-100 last:border-0 animate-slide-up"
              style={{
                animationDelay: `${index * 50}ms`,
              }}
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Icon className="h-4 w-4 text-primary" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {isAI ? (
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 flex items-center gap-1 text-xs">
                      <Bot className="h-3 w-3" />
                      AI Assistant
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 flex items-center gap-1 text-xs">
                      <User className="h-3 w-3" />
                      User
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">{getTimeAgo(activity.created_at)}</span>
                </div>

                <p className="text-sm text-foreground">
                  <span className="font-medium capitalize">{actionLabel}</span>
                  {' '}
                  <span className="text-muted-foreground">{activity.resource_type}</span>
                </p>

                {activity.metadata?.source && (
                  <p className="text-xs text-muted-foreground mt-1">
                    via {activity.metadata.source.replace('_', ' ')}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
