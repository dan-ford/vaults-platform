"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useOrganization } from '@/lib/context/organization-context';

export interface DashboardStats {
  tasks: {
    total: number;
    todo: number;
    in_progress: number;
    blocked: number;
    done: number;
    archived: number;
  };
  risks: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    byStatus: Record<string, number>;
  };
  decisions: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    implemented: number;
  };
  documents: {
    total: number;
    thisWeek: number;
  };
  milestones: {
    total: number;
    planned: number;
    in_progress: number;
    completed: number;
    delayed: number;
  };
  contacts: {
    total: number;
    active: number;
    byType: Record<string, number>;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    resource_type: string;
    resource_id: string | null;
    actor_type: string;
    created_at: string;
    metadata: any;
  }>;
}

export function useDashboardData() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { currentOrg } = useOrganization();
  const supabase = createClient();

  const loadDashboardData = async () => {
    if (!currentOrg) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // Fetch all data in parallel
      const [
        tasksResult,
        risksResult,
        decisionsResult,
        documentsResult,
        milestonesResult,
        contactsResult,
        activityResult
      ] = await Promise.all([
        // Tasks
        supabase
          .from('tasks')
          .select('status')
          .eq('org_id', currentOrg.id),

        // Risks
        supabase
          .from('risks')
          .select('impact, probability, status')
          .eq('org_id', currentOrg.id),

        // Decisions
        supabase
          .from('decisions')
          .select('status')
          .eq('org_id', currentOrg.id),

        // Documents (with this week filter)
        supabase
          .from('documents')
          .select('created_at')
          .eq('org_id', currentOrg.id),

        // Milestones
        supabase
          .from('milestones')
          .select('status')
          .eq('org_id', currentOrg.id),

        // Contacts
        supabase
          .from('contacts')
          .select('type, status')
          .eq('org_id', currentOrg.id),

        // Recent activity (last 10)
        supabase
          .from('activity_log')
          .select('id, action, resource_type, resource_id, actor_type, created_at, metadata')
          .eq('org_id', currentOrg.id)
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      // Process tasks
      const tasks = tasksResult.data || [];
      const taskStats = {
        total: tasks.length,
        todo: tasks.filter(t => t.status === 'todo').length,
        in_progress: tasks.filter(t => t.status === 'in_progress').length,
        blocked: tasks.filter(t => t.status === 'blocked').length,
        done: tasks.filter(t => t.status === 'done').length,
        archived: tasks.filter(t => t.status === 'archived').length,
      };

      // Process risks
      const risks = risksResult.data || [];
      const risksByStatus: Record<string, number> = {};
      risks.forEach(risk => {
        risksByStatus[risk.status] = (risksByStatus[risk.status] || 0) + 1;
      });

      const riskStats = {
        total: risks.length,
        critical: risks.filter(r => r.impact === 'critical').length,
        high: risks.filter(r => r.impact === 'high').length,
        medium: risks.filter(r => r.impact === 'medium').length,
        low: risks.filter(r => r.impact === 'low').length,
        byStatus: risksByStatus,
      };

      // Process decisions
      const decisions = decisionsResult.data || [];
      const decisionStats = {
        total: decisions.length,
        pending: decisions.filter(d => d.status === 'pending').length,
        approved: decisions.filter(d => d.status === 'approved').length,
        rejected: decisions.filter(d => d.status === 'rejected').length,
        implemented: decisions.filter(d => d.status === 'implemented').length,
      };

      // Process documents
      const documents = documentsResult.data || [];
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const documentsThisWeek = documents.filter(
        d => new Date(d.created_at) >= oneWeekAgo
      ).length;

      const documentStats = {
        total: documents.length,
        thisWeek: documentsThisWeek,
      };

      // Process milestones
      const milestones = milestonesResult.data || [];
      const milestoneStats = {
        total: milestones.length,
        planned: milestones.filter(m => m.status === 'planned').length,
        in_progress: milestones.filter(m => m.status === 'in_progress').length,
        completed: milestones.filter(m => m.status === 'completed').length,
        delayed: milestones.filter(m => m.status === 'delayed').length,
      };

      // Process contacts
      const contacts = contactsResult.data || [];
      const contactsByType: Record<string, number> = {};
      contacts.forEach(contact => {
        contactsByType[contact.type] = (contactsByType[contact.type] || 0) + 1;
      });

      const contactStats = {
        total: contacts.length,
        active: contacts.filter(c => c.status === 'active').length,
        byType: contactsByType,
      };

      // Recent activity
      const recentActivity = activityResult.data || [];

      setStats({
        tasks: taskStats,
        risks: riskStats,
        decisions: decisionStats,
        documents: documentStats,
        milestones: milestoneStats,
        contacts: contactStats,
        recentActivity,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    // Reload when page becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadDashboardData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [currentOrg?.id]);

  // Realtime subscriptions for live updates
  useEffect(() => {
    if (!currentOrg) return;

    const channel = supabase
      .channel('dashboard-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `org_id=eq.${currentOrg.id}`,
        },
        () => loadDashboardData()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'risks',
          filter: `org_id=eq.${currentOrg.id}`,
        },
        () => loadDashboardData()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'decisions',
          filter: `org_id=eq.${currentOrg.id}`,
        },
        () => loadDashboardData()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents',
          filter: `org_id=eq.${currentOrg.id}`,
        },
        () => loadDashboardData()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'milestones',
          filter: `org_id=eq.${currentOrg.id}`,
        },
        () => loadDashboardData()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contacts',
          filter: `org_id=eq.${currentOrg.id}`,
        },
        () => loadDashboardData()
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_log',
          filter: `org_id=eq.${currentOrg.id}`,
        },
        () => loadDashboardData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrg?.id]);

  return { stats, isLoading, refresh: loadDashboardData };
}
