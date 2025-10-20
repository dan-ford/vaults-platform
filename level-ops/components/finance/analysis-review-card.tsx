"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Percent,
  Wallet,
  Flame,
  Calendar,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Tables } from "@/lib/supabase/database.types";

type FinancialAnalysis = Tables<"financial_analyses">;

interface MetricData {
  value: number | null;
  confidence: number;
  source: string;
}

interface ExtractedData {
  metrics: {
    arr?: MetricData;
    revenue?: MetricData;
    gross_margin?: MetricData;
    cash?: MetricData;
    burn?: MetricData;
  };
  detected_period?: string;
  insights?: string[];
  warnings?: string[];
  recommendations?: string[];
}

interface AnalysisReviewCardProps {
  analysis: FinancialAnalysis;
  onApprove?: () => void;
  onReject?: () => void;
}

const metricIcons = {
  arr: TrendingUp,
  revenue: DollarSign,
  gross_margin: Percent,
  cash: Wallet,
  burn: Flame,
};

const metricLabels = {
  arr: "ARR",
  revenue: "Monthly Revenue",
  gross_margin: "Gross Margin",
  cash: "Cash Balance",
  burn: "Monthly Burn Rate",
};

const metricFormats = {
  arr: (value: number) => `$${(value / 1000000).toFixed(2)}M`,
  revenue: (value: number) => `$${(value / 1000).toFixed(0)}K`,
  gross_margin: (value: number) => `${value.toFixed(1)}%`,
  cash: (value: number) => `$${(value / 1000).toFixed(0)}K`,
  burn: (value: number) => `$${(value / 1000).toFixed(0)}K`,
};

export function AnalysisReviewCard({
  analysis,
  onApprove,
  onReject,
}: AnalysisReviewCardProps) {
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, number>>({});
  const supabase = createClient();

  const extractedData = analysis.extracted_data as ExtractedData | null;
  const metrics = extractedData?.metrics || {};

  const hasLowConfidence = Object.values(metrics).some(
    (metric) => metric && metric.confidence < 0.5
  );

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) {
      return (
        <Badge variant="default" className="bg-green-600">
          High ({(confidence * 100).toFixed(0)}%)
        </Badge>
      );
    } else if (confidence >= 0.5) {
      return (
        <Badge variant="secondary" className="bg-yellow-600 text-white">
          Medium ({(confidence * 100).toFixed(0)}%)
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive">
          Low ({(confidence * 100).toFixed(0)}%)
        </Badge>
      );
    }
  };

  const handleApprove = async () => {
    setApproving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Not authenticated");

      // Get the detected period or use current month
      const period =
        extractedData?.detected_period ||
        new Date().toISOString().slice(0, 7);

      // Prepare snapshot data (use edited values if provided)
      const snapshotData = {
        org_id: analysis.org_id,
        period,
        arr: editedValues.arr ?? metrics.arr?.value,
        revenue: editedValues.revenue ?? metrics.revenue?.value,
        gross_margin:
          editedValues.gross_margin ?? metrics.gross_margin?.value,
        cash: editedValues.cash ?? metrics.cash?.value,
        burn: editedValues.burn ?? metrics.burn?.value,
        source_ref: analysis.document_id,
        notes: `AI-extracted from document. Overall confidence: ${(analysis.confidence_score || 0) * 100}%`,
        created_by: user.id,
      };

      // Calculate runway if we have cash and burn
      if (snapshotData.cash && snapshotData.burn && snapshotData.burn > 0) {
        snapshotData.runway_days = Math.floor(
          (snapshotData.cash / snapshotData.burn) * 30
        );
      }

      // Create financial snapshot
      const { data: snapshot, error: snapshotError } = await supabase
        .from("financial_snapshots")
        .insert(snapshotData)
        .select()
        .single();

      if (snapshotError) {
        throw new Error(`Failed to create snapshot: ${snapshotError.message}`);
      }

      // Update analysis as approved
      const { error: updateError } = await supabase
        .from("financial_analyses")
        .update({
          approved: true,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          snapshot_id: snapshot.id,
          analysis_status: "completed",
        })
        .eq("id", analysis.id);

      if (updateError) {
        throw new Error(`Failed to update analysis: ${updateError.message}`);
      }

      toast.success("Financial snapshot created successfully!");

      if (onApprove) {
        onApprove();
      }
    } catch (error) {
      console.error("Approval error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to approve analysis"
      );
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    setRejecting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Not authenticated");

      // Update analysis as rejected
      const { error: updateError } = await supabase
        .from("financial_analyses")
        .update({
          approved: false,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          analysis_status: "failed",
        })
        .eq("id", analysis.id);

      if (updateError) {
        throw new Error(`Failed to reject analysis: ${updateError.message}`);
      }

      toast.info("Analysis rejected");

      if (onReject) {
        onReject();
      }
    } catch (error) {
      console.error("Rejection error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to reject analysis"
      );
    } finally {
      setRejecting(false);
    }
  };

  const handleValueEdit = (metricKey: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setEditedValues((prev) => ({ ...prev, [metricKey]: numValue }));
    }
  };

  const isProcessing = approving || rejecting;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              AI Analysis Results
              {analysis.analysis_status === "review" && (
                <Badge variant="secondary">Needs Review</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Extracted from: {analysis.document_id}
              {extractedData?.detected_period && (
                <>
                  {" "}
                  • Period: {extractedData.detected_period}
                </>
              )}
            </CardDescription>
          </div>
          <div className="text-sm text-gray-500">
            Processed in {analysis.processing_time_ms}ms
          </div>
        </div>

        {hasLowConfidence && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-900">
                Some metrics need verification
              </p>
              <p className="text-yellow-800">
                One or more metrics have low confidence scores. Please review
                and edit as needed.
              </p>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Extracted Metrics */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm">Extracted Financial Metrics</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {Object.entries(metrics).map(([key, metric]) => {
              if (!metric) return null;

              const Icon = metricIcons[key as keyof typeof metricIcons];
              const label = metricLabels[key as keyof typeof metricLabels];
              const format = metricFormats[key as keyof typeof metricFormats];
              const lowConfidence = metric.confidence < 0.5;

              return (
                <div
                  key={key}
                  className={`border rounded-lg p-3 space-y-2 ${
                    lowConfidence ? "border-yellow-300 bg-yellow-50" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-gray-600" />
                      <Label className="text-sm font-medium">{label}</Label>
                    </div>
                    {getConfidenceBadge(metric.confidence)}
                  </div>

                  <div className="space-y-1">
                    {lowConfidence ? (
                      <Input
                        type="number"
                        step="any"
                        defaultValue={metric.value || ""}
                        onChange={(e) => handleValueEdit(key, e.target.value)}
                        className="h-8"
                        placeholder="Enter corrected value"
                      />
                    ) : (
                      <div className="text-2xl font-bold">
                        {metric.value !== null
                          ? format(metric.value)
                          : "N/A"}
                      </div>
                    )}
                    <div className="text-xs text-gray-500">
                      Source: {metric.source}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Insights */}
        {extractedData?.insights && extractedData.insights.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">AI Insights</h3>
            <ul className="space-y-1">
              {extractedData.insights.map((insight, i) => (
                <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Warnings */}
        {extractedData?.warnings && extractedData.warnings.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-yellow-900">Warnings</h3>
            <ul className="space-y-1">
              {extractedData.warnings.map((warning, i) => (
                <li key={i} className="text-sm text-yellow-800 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {extractedData?.recommendations &&
          extractedData.recommendations.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">AI Recommendations</h3>
              <ul className="space-y-1">
                {extractedData.recommendations.map((rec, i) => (
                  <li key={i} className="text-sm text-blue-700 flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
      </CardContent>

      <CardFooter className="flex justify-between gap-2">
        <Button
          variant="outline"
          onClick={handleReject}
          disabled={isProcessing || analysis.approved === false}
        >
          {rejecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Rejecting...
            </>
          ) : (
            <>
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </>
          )}
        </Button>

        <Button
          onClick={handleApprove}
          disabled={isProcessing || analysis.approved === true}
        >
          {approving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Snapshot...
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Approve & Create Snapshot
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
