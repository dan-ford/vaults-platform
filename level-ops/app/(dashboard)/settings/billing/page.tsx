"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/organization-context";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/error-states";
import { AlertCircle, Check, CreditCard, Calendar } from "lucide-react";

interface Subscription {
  id: string;
  status: string;
  plan_tier: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

const planDetails: Record<string, { name: string; price: string; seats: number; features: string[] }> = {
  free: {
    name: "Free",
    price: "$0/month",
    seats: 10,
    features: ["10 team members", "Basic features", "1GB storage"],
  },
  small: {
    name: "Small",
    price: "$49/month",
    seats: 25,
    features: ["25 team members", "Advanced features", "10GB storage", "AI assistant"],
  },
  medium: {
    name: "Medium",
    price: "$149/month",
    seats: 50,
    features: ["50 team members", "All features", "50GB storage", "Priority support"],
  },
  enterprise: {
    name: "Enterprise",
    price: "Custom pricing",
    seats: 999,
    features: ["Unlimited members", "Enterprise features", "Unlimited storage", "Dedicated support"],
  },
};

export default function BillingPage() {
  const { currentOrg } = useOrganization();
  const { canEdit } = usePermissions();
  const supabase = createClient();

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (currentOrg) {
      loadSubscription();
    }
  }, [currentOrg]);

  const loadSubscription = async () => {
    if (!currentOrg) return;

    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("org_id", currentOrg.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading subscription:", error);
      } else if (data) {
        setSubscription(data);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    if (!currentOrg) return;

    setActionLoading(true);

    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          org_id: currentOrg.id,
        }),
      });

      const data = await response.json();

      if (response.ok && data.portal_url) {
        window.location.href = data.portal_url;
      } else {
        console.error("Failed to open portal:", data.error);
        alert("Failed to open billing portal. Please try again.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpgrade = () => {
    window.location.href = "/pricing";
  };

  if (loading) {
    return <LoadingState message="Loading billing information..." />;
  }

  if (!canEdit) {
    return (
      <div className="container-xl py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Insufficient Permissions
            </CardTitle>
            <CardDescription>
              Only organization owners and admins can manage billing.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const currentPlanTier = subscription?.plan_tier?.toLowerCase() || "free";
  const plan = planDetails[currentPlanTier];

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    trialing: "bg-blue-100 text-blue-800",
    canceled: "bg-gray-100 text-gray-800",
    past_due: "bg-red-100 text-red-800",
    incomplete: "bg-yellow-100 text-yellow-800",
  };

  const statusColor = statusColors[subscription?.status || ""] || "bg-gray-100 text-gray-800";

  return (
    <div className="container-xl py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Billing & Subscription</h1>
        <p className="text-muted-foreground mt-2">
          Manage your organization's subscription and billing settings
        </p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>
                {currentOrg?.name} is on the {plan.name} plan
              </CardDescription>
            </div>
            {subscription?.status && (
              <Badge className={statusColor}>
                {subscription.status.replace("_", " ").toUpperCase()}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-lg mb-2">{plan.name}</h3>
              <p className="text-2xl font-bold text-primary mb-4">{plan.price}</p>
              <ul className="space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <Check className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              {subscription?.current_period_end && (
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">
                      {subscription.cancel_at_period_end
                        ? "Subscription ends"
                        : "Next billing date"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(subscription.current_period_end).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              )}

              {subscription?.cancel_at_period_end && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <p className="text-sm text-yellow-800">
                    Your subscription will be canceled at the end of the current billing period.
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {currentPlanTier !== "enterprise" && (
                  <Button onClick={handleUpgrade} variant="default" size="lg">
                    Upgrade Plan
                  </Button>
                )}

                {subscription && (
                  <Button
                    onClick={handleManageBilling}
                    variant="outline"
                    size="lg"
                    disabled={actionLoading}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    {actionLoading ? "Loading..." : "Manage Billing"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Usage</CardTitle>
          <CardDescription>Current usage for {currentOrg?.name}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Team Members</span>
                <span className="text-sm text-muted-foreground">
                  {currentOrg?.members_count || 0} / {plan.seats}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary rounded-full h-2 transition-all"
                  style={{
                    width: `${Math.min(((currentOrg?.members_count || 0) / plan.seats) * 100, 100)}%`,
                  }}
                />
              </div>
              {(currentOrg?.members_count || 0) >= plan.seats && (
                <p className="text-sm text-yellow-600 mt-2">
                  You've reached your seat limit. Upgrade to add more members.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing History */}
      {subscription && (
        <Card>
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
            <CardDescription>View and download past invoices</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Click "Manage Billing" above to view your complete billing history and download invoices.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
