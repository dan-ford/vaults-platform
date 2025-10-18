"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, AlertTriangle, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/supabase/database.types";
import { useOrganization } from "@/lib/context/organization-context";
import { LoadingState } from "@/components/error-states";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { isModuleEnabled, type ModuleSettings } from "@/lib/types/modules";

type Decision = Tables<"decisions">;
type Risk = Tables<"risks">;

const DECISION_STATUS_COLORS = {
  proposed: "bg-primary/10 text-primary border-primary/20",
  accepted: "bg-slate-200 text-slate-900 border-slate-300",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  deprecated: "bg-gray-100 text-gray-800 border-gray-200",
  superseded: "bg-slate-100 text-slate-700 border-slate-200",
};

const RISK_STATUS_COLORS = {
  identified: "bg-slate-100 text-slate-800 border-slate-200",
  mitigating: "bg-primary/10 text-primary border-primary/20",
  mitigated: "bg-slate-200 text-slate-900 border-slate-300",
  accepted: "bg-slate-100 text-slate-700 border-slate-200",
  occurred: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function GovernancePage() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("decisions");
  const supabase = createClient();
  const { currentOrg } = useOrganization();
  const router = useRouter();
  const { role } = usePermissions();

  // Check if both modules are enabled
  const decisionsEnabled = currentOrg && isModuleEnabled(currentOrg.settings as ModuleSettings, "decisions");
  const risksEnabled = currentOrg && isModuleEnabled(currentOrg.settings as ModuleSettings, "risks");

  // Redirect if neither module is enabled
  useEffect(() => {
    if (currentOrg && !decisionsEnabled && !risksEnabled) {
      router.push("/dashboard");
    }
  }, [currentOrg, decisionsEnabled, risksEnabled, router]);

  // Load data function
  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !currentOrg) {
        setIsLoading(false);
        return;
      }

      // Load decisions if enabled
      if (decisionsEnabled) {
        const { data: decisionsData } = await supabase
          .from("decisions")
          .select("*")
          .eq("org_id", currentOrg.id)
          .order("created_at", { ascending: false })
          .limit(10);

        if (decisionsData) setDecisions(decisionsData);
      }

      // Load risks if enabled
      if (risksEnabled) {
        const { data: risksData } = await supabase
          .from("risks")
          .select("*")
          .eq("org_id", currentOrg.id)
          .order("created_at", { ascending: false })
          .limit(10);

        if (risksData) setRisks(risksData);
      }
    } catch (error) {
      console.error("Error loading governance data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load on mount and when page becomes visible
  useEffect(() => {
    if (!currentOrg) return;
    loadData();

    const handleVisibilityChange = () => {
      if (!document.hidden) loadData();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [currentOrg?.id, decisionsEnabled, risksEnabled]);

  // Realtime subscriptions
  useEffect(() => {
    if (!currentOrg) return;

    const channels: any[] = [];

    if (decisionsEnabled) {
      const decisionsChannel = supabase
        .channel('governance-decisions-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'decisions', filter: `org_id=eq.${currentOrg.id}` },
          () => loadData()
        )
        .subscribe();
      channels.push(decisionsChannel);
    }

    if (risksEnabled) {
      const risksChannel = supabase
        .channel('governance-risks-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'risks', filter: `org_id=eq.${currentOrg.id}` },
          () => loadData()
        )
        .subscribe();
      channels.push(risksChannel);
    }

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [currentOrg?.id, decisionsEnabled, risksEnabled]);

  if (isLoading) {
    return <LoadingState message="Loading governance data..." />;
  }

  // Determine which tabs to show
  const showDecisions = decisionsEnabled;
  const showRisks = risksEnabled;

  // Set default tab to first enabled module
  const defaultTab = showDecisions ? "decisions" : "risks";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            Governance
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Decision and Risk Analysis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {role || "Member"}
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue={defaultTab} className="w-full">
        <TabsList>
          {showDecisions && (
            <TabsTrigger value="decisions" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Decisions ({decisions.length})
            </TabsTrigger>
          )}
          {showRisks && (
            <TabsTrigger value="risks" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Risks ({risks.length})
            </TabsTrigger>
          )}
        </TabsList>

        {showDecisions && (
          <TabsContent value="decisions" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Recent decisions (showing up to 10)
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/decisions")}
                className="flex items-center gap-2"
              >
                View All
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>

            {decisions.length === 0 ? (
              <Card className="p-8">
                <div className="text-center">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <h3 className="mt-4 text-lg font-semibold">No decisions yet</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Get started by creating your first decision record
                  </p>
                  <Button
                    onClick={() => router.push("/decisions")}
                    className="mt-4"
                  >
                    Go to Decisions
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="grid gap-4">
                {decisions.map((decision) => (
                  <Card
                    key={decision.id}
                    className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => router.push("/decisions")}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">
                          {decision.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {decision.context}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={DECISION_STATUS_COLORS[decision.status as keyof typeof DECISION_STATUS_COLORS]}
                      >
                        {decision.status}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}

        {showRisks && (
          <TabsContent value="risks" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Recent risks (showing up to 10)
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/risks")}
                className="flex items-center gap-2"
              >
                View All
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>

            {risks.length === 0 ? (
              <Card className="p-8">
                <div className="text-center">
                  <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <h3 className="mt-4 text-lg font-semibold">No risks identified</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Get started by identifying your first risk
                  </p>
                  <Button
                    onClick={() => router.push("/risks")}
                    className="mt-4"
                  >
                    Go to Risks
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="grid gap-4">
                {risks.map((risk) => (
                  <Card
                    key={risk.id}
                    className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => router.push("/risks")}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">
                          {risk.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {risk.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            Impact: {risk.impact}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Probability: {risk.probability}
                          </Badge>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={RISK_STATUS_COLORS[risk.status as keyof typeof RISK_STATUS_COLORS]}
                      >
                        {risk.status}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
