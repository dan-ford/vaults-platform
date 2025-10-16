import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Clock, Shield, TrendingUp, FileCheck, Users } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold text-gray-900">Level</div>
          <nav className="flex items-center gap-6">
            <Link href="/pricing" className="text-gray-600 hover:text-gray-900 font-medium">
              Pricing
            </Link>
            <Link href="/login" className="text-gray-600 hover:text-gray-900 font-medium">
              Sign In
            </Link>
            <Link href="/login">
              <Button>Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Executive Clarity for<br />Founders and Investors
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            A premium portfolio console with an acting agent—board-ready updates in minutes, not days.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/login">
              <Button size="lg" className="text-lg px-8">
                Start Free Trial
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="text-lg px-8">
                View Pricing
              </Button>
            </Link>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            14-day free trial • No credit card required
          </p>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            The private jet of executive portfolio operations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Clock className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Save 16 Hours Per Month</CardTitle>
                <CardDescription>
                  Generate weekly board updates in under 10 minutes. Reclaim a full workweek every month.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <FileCheck className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Board-Ready Instantly</CardTitle>
                <CardDescription>
                  Auto-generated board packs with immutable snapshots and SHA256 hashes. Audit-ready from day one.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Shield className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Bank-Level Security</CardTitle>
                <CardDescription>
                  RLS-enforced isolation, encrypted data, and full audit trails. GDPR and SOC 2 compliant.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                What Level does differently
              </h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <Check className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Executive-Only Layer</h3>
                    <p className="text-gray-600">
                      Not another task tool. Level synthesizes milestones, risks, and decisions into board-ready insights.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Check className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Agent-Drafted Summaries</h3>
                    <p className="text-gray-600">
                      AI assistant with RAG-powered citations that drafts updates, responds to investor requests, and acts on your behalf.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Check className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Immutable Audit Trail</h3>
                    <p className="text-gray-600">
                      Every board pack comes with a cryptographic hash. No more "where did this number come from?"
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Check className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">White-Label Ready</h3>
                    <p className="text-gray-600">
                      Custom domains, branded reports, and multi-tenant isolation. Perfect for investor portfolios.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-xl p-8 border border-gray-200">
              <div className="space-y-6">
                <div>
                  <div className="text-sm text-gray-600 mb-2">ROI Example: Founder</div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-700">Current monthly cost</span>
                      <span className="font-semibold">£6,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Level cost</span>
                      <span className="font-semibold">£499</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2 flex justify-between">
                      <span className="font-semibold text-gray-900">Monthly savings</span>
                      <span className="font-bold text-primary text-xl">£5,501</span>
                    </div>
                  </div>
                  <div className="mt-4 text-center">
                    <span className="inline-block bg-primary/10 text-primary px-4 py-2 rounded-full font-semibold">
                      11x ROI
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ideal Customers Section */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Built for executive clarity
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Users className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Founders</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span>Draft board updates in under 10 minutes</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span>Generate branded board packs automatically</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span>Respond to investor requests with citations</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <TrendingUp className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Investors</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span>Live portfolio status across all holdings</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span>Batch board packs for LP reporting</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span>At-risk flags and trend analysis</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Shield className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Enterprises</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span>Dedicated infrastructure with region residency</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span>99.9% SLA with disaster recovery</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span>SOC 2 Type II compliance</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 bg-gradient-to-b from-primary/5 to-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Ready to reclaim your time?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join founders and investors who have transformed their board operations with Level.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/login">
              <Button size="lg" className="text-lg px-8">
                Start Free Trial
              </Button>
            </Link>
            <Link href="mailto:hello@level.app">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Contact Sales
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="text-2xl font-bold text-gray-900 mb-4">Level</div>
              <p className="text-sm text-gray-600">
                The private jet of executive portfolio operations.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link href="/pricing" className="hover:text-gray-900">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-gray-900">
                    Sign In
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <a href="mailto:hello@level.app" className="hover:text-gray-900">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link href="/privacy" className="hover:text-gray-900">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-gray-900">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-200 text-center text-sm text-gray-600">
            {new Date().getFullYear()} Level. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
