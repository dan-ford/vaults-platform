"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useOrganization } from '@/lib/context/organization-context';
import { Calendar, Target } from "lucide-react";

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  target_date: string;
  status: string;
}

const STATUS_COLORS: Record<string, string> = {
  planned: 'bg-slate-100 text-slate-800 border-slate-200',
  in_progress: 'bg-primary/10 text-primary border-primary/20',
  completed: 'bg-green-100 text-green-800 border-green-200',
  delayed: 'bg-red-100 text-red-800 border-red-200',
};

function getDaysUntil(dateString: string): string {
  const targetDate = new Date(dateString);
  const now = new Date();
  const diffTime = targetDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  return `${diffDays} days remaining`;
}

export function MilestonesProgress() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentOrg } = useOrganization();
  const supabase = createClient();

  useEffect(() => {
    const loadMilestones = async () => {
      if (!currentOrg) {
        setIsLoading(false);
        return;
      }

      // Get upcoming and in-progress milestones
      const { data } = await supabase
        .from('milestones')
        .select('id, title, description, target_date, status')
        .eq('org_id', currentOrg.id)
        .in('status', ['planned', 'in_progress', 'delayed'])
        .order('target_date', { ascending: true })
        .limit(5);

      if (data) {
        setMilestones(data);
      }
      setIsLoading(false);
    };

    loadMilestones();
  }, [currentOrg?.id]);

  if (isLoading) {
    return (
      <Card className="p-6 h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading milestones...</p>
        </div>
      </Card>
    );
  }

  if (milestones.length === 0) {
    return (
      <Card className="p-6 h-full flex items-center justify-center">
        <div className="text-center">
          <Target className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No active milestones</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 animate-fade-in">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">Milestones</h3>
        <p className="text-sm text-muted-foreground">Upcoming and in-progress</p>
      </div>

      <div className="space-y-4">
        {milestones.map((milestone, index) => {
          return (
            <div
              key={milestone.id}
              className="animate-slide-up"
              style={{
                animationDelay: `${index * 50}ms`,
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-foreground">{milestone.title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className={STATUS_COLORS[milestone.status] || STATUS_COLORS.planned}>
                      {milestone.status.replace('_', ' ')}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {getDaysUntil(milestone.target_date)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
