"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

const plans = [
  {
    tier: "founder",
    name: "Founder Portfolio",
    price: "£149",
    period: "per user per month",
    seats: "Up to 5 companies",
    description: "Perfect for serial founders",
    features: [
      "Up to 5 companies (organizations)",
      "Unlimited milestones, risks, decisions",
      "Weekly exec summaries (agent-drafted)",
      "10GB document storage (RAG-enabled)",
      "Email + Google/Microsoft OAuth",
      "Standard support (business hours, <4hr response)",
    ],
    cta: "Start Free Trial",
    highlighted: false,
    annual: "£1,788/year (save 10%)",
  },
  {
    tier: "company",
    name: "Company",
    price: "£499",
    period: "per tenant per month",
    seats: "Unlimited users",
    description: "For scale-ups with active boards",
    features: [
      "Single company (unlimited users within org)",
      "Unlimited milestones, risks, decisions, documents",
      "Weekly + monthly exec summaries",
      "Board pack generation (branded PDF + immutable snapshot)",
      "50GB storage",
      "Investor request/response workflows",
      "Priority support (<2hr response)",
      "SSO (Google/Microsoft OAuth)",
    ],
    cta: "Start Free Trial",
    highlighted: true,
    annual: "£5,988/year (save 10%)",
  },
  {
    tier: "investor",
    name: "Investor Studio",
    price: "£999",
    period: "per org per month",
    seats: "Up to 25 portfolio companies",
    description: "For family offices and VC funds",
    features: [
      "Up to 25 portfolio companies",
      "Unlimited users (investor team + founders)",
      "Portfolio Console (live status cards, at-risk flags)",
      "Batch board packs (select 10 companies → generate LP report)",
      "100GB storage",
      "White-label branding (firm's logo/colors)",
      "Custom domain (ops.your-firm.com)",
      "Premium support (<1hr response, 24/7 for P1)",
    ],
    cta: "Start Free Trial",
    highlighted: false,
    annual: "£11,988/year (save 10%)",
  },
  {
    tier: "enterprise",
    name: "Enterprise",
    price: "£2,500",
    period: "per node per month + £2,000 setup",
    seats: "Unlimited",
    description: "For large-scale operations with dedicated infrastructure",
    features: [
      "Dedicated Supabase project (isolated DB + compute)",
      "Region residency (EU/UK/US/APAC)",
      "Unlimited companies, users, documents",
      "Custom compute sizing (XL baseline, 2XL/4XL available)",
      "SLA: 99.9% uptime (credits for downtime)",
      "RPO: 1 hour, RTO: 4 hours",
      "DPA + sub-processor list",
      "SOC 2 Type II roadmap access",
      "White-glove support (dedicated CSM, 24/7 on-call)",
    ],
    cta: "Contact Sales",
    highlighted: false,
    annual: "£30,000/year + setup (12-month minimum)",
  },
];

export default function PricingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSelectPlan = async (tier: string) => {
    setLoading(tier);

    try {
      // Check if user is authenticated
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // Redirect to login with return URL
        router.push(`/login?redirect=/pricing&plan=${tier}`);
        return;
      }

      if (tier === "founder") {
        // Founder plan - redirect to signup/dashboard
        router.push("/dashboard");
        return;
      }

      if (tier === "enterprise") {
        // Enterprise - redirect to contact form
        window.location.href = "mailto:sales@level.app?subject=Enterprise Plan Inquiry";
        return;
      }

      // Get user's current organization
      const { data: memberships } = await supabase
        .from("org_memberships")
        .select("org_id, organizations(id, name)")
        .eq("user_id", user.id)
        .limit(1);

      if (!memberships || memberships.length === 0) {
        // No organization - redirect to create one first
        router.push("/dashboard");
        return;
      }

      const orgId = memberships[0].org_id;

      // Create checkout session
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          org_id: orgId,
          plan_tier: tier,
        }),
      });

      const data = await response.json();

      if (response.ok && data.checkout_url) {
        // Redirect to Stripe Checkout
        window.location.href = data.checkout_url;
      } else {
        console.error("Failed to create checkout session:", data.error);
        alert("Failed to start checkout. Please try again.");
      }
    } catch (error) {
      console.error("Error selecting plan:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Premium portfolio operations for founders, investors, and enterprises. All plans include a 14-day free trial.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.tier}
              className={`relative flex flex-col ${
                plan.highlighted
                  ? "border-primary shadow-lg scale-105"
                  : "border-gray-200"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-white px-4 py-1">
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-gray-900">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-gray-600 ml-2 text-sm">/{plan.period}</span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {plan.seats}
                </p>
                {plan.annual && (
                  <p className="text-xs text-primary mt-1">
                    {plan.annual}
                  </p>
                )}
              </CardHeader>

              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  variant={plan.highlighted ? "default" : "outline"}
                  onClick={() => handleSelectPlan(plan.tier)}
                  disabled={loading === plan.tier}
                >
                  {loading === plan.tier ? "Loading..." : plan.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Add-Ons Section */}
        <div className="mt-16 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Add-Ons (All Tiers)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Extra Users</CardTitle>
                <CardDescription>£10/user/month (Company tier, beyond 50 users)</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Extra Companies</CardTitle>
                <CardDescription>£50/company/month (Investor Studio, beyond 25 companies)</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Extra Storage</CardTitle>
                <CardDescription>£50/100GB/month (all tiers)</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">SSO (SAML/Okta)</CardTitle>
                <CardDescription>£500/month (Enterprise auth, Tier 3+)</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">API Connectors</CardTitle>
                <CardDescription>£200/connector/month (Jira, Salesforce, QuickBooks, etc.)</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dedicated CSM</CardTitle>
                <CardDescription>£1,500/month (Weekly check-ins, QBRs, Tier 3+)</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* ROI Section */}
        <div className="mt-16 max-w-4xl mx-auto bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Return on Investment
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">Founder</h3>
              <p className="text-sm text-gray-600 mb-4">Manual process: £6,000/month</p>
              <p className="text-2xl font-bold text-primary">£5,501/month saved</p>
              <p className="text-sm text-gray-600 mt-2">11x ROI</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">Investor</h3>
              <p className="text-sm text-gray-600 mb-4">Manual process: £5,000/month</p>
              <p className="text-2xl font-bold text-primary">£4,001/month saved</p>
              <p className="text-sm text-gray-600 mt-2">5x ROI</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">Enterprise</h3>
              <p className="text-sm text-gray-600 mb-4">Custom tool: £86,667/year</p>
              <p className="text-2xl font-bold text-primary">£56,667/year saved</p>
              <p className="text-sm text-gray-600 mt-2">2.9x ROI</p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Can I change plans later?
              </h3>
              <p className="text-gray-600">
                Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate your billing accordingly.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                We already use Asana/Notion. Can Level integrate?
              </h3>
              <p className="text-gray-600">
                Level doesn't replace your task tools—it sits on top. We extract executive-level insights (milestones, risks, decisions) and let your team keep working where they're comfortable. Think of us as your board-ready layer, not your daily ops tool.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                What if our data leaks to another tenant?
              </h3>
              <p className="text-gray-600">
                Impossible. RLS is enforced at the database level—Postgres won't return cross-tenant data even if the app tries. We run leakage tests in CI (zero failures in 500+ tests). Plus, Dedicated Nodes give you isolated infrastructure—no shared compute.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Is there a free trial?
              </h3>
              <p className="text-gray-600">
                Yes, all paid plans include a 14-day free trial. No credit card required to start your trial.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-gray-600">
                We accept all major credit cards (Visa, MasterCard, American Express) via Stripe's secure payment processing.
              </p>
            </div>
          </div>
        </div>

        {/* Back to Login */}
        <div className="mt-12 text-center">
          <Button variant="ghost" onClick={() => router.push("/login")}>
            Already have an account? Sign In
          </Button>
        </div>
      </div>
    </div>
  );
}
