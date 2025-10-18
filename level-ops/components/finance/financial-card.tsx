"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Pencil, DollarSign, Wallet, Percent, Calendar } from "lucide-react";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { FinancialSnapshotForm } from "./snapshot-form";

type FinancialSnapshot = {
  id: string;
  org_id: string;
  period: string;
  arr: number | null;
  revenue: number | null;
  gross_margin: number | null;
  cash: number | null;
  burn: number | null;
  runway_days: number | null;
  notes: string | null;
};

interface FinancialCardProps {
  snapshot: FinancialSnapshot;
  previousSnapshot?: FinancialSnapshot;
  onRefresh: () => void;
  compact?: boolean;
}

export function FinancialCard({ snapshot, previousSnapshot, onRefresh, compact = false }: FinancialCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { canEdit } = usePermissions();

  const formatCurrency = (value: number | null) => {
    if (value === null) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  };

  const formatPercent = (value: number | null) => {
    if (value === null) return "—";
    return `${value.toFixed(1)}%`;
  };

  const formatDays = (days: number | null) => {
    if (days === null) return "—";
    if (days > 365) {
      return `${Math.floor(days / 30)} months`;
    }
    return `${days} days`;
  };

  const calculateTrend = (current: number | null, previous: number | null) => {
    if (current === null || previous === null || previous === 0) {
      return { trend: "neutral" as const, percent: 0 };
    }
    const diff = current - previous;
    const percent = (diff / previous) * 100;
    const trend = diff > 0 ? "up" as const : diff < 0 ? "down" as const : "neutral" as const;
    return { trend, percent };
  };

  const getTrendIcon = (trend: "up" | "down" | "neutral") => {
    if (trend === "up") return <TrendingUp className="h-3 w-3 text-green-600" />;
    if (trend === "down") return <TrendingDown className="h-3 w-3 text-red-600" />;
    return <Minus className="h-3 w-3 text-gray-400" />;
  };

  const getTrendColor = (trend: "up" | "down" | "neutral", positive: boolean = true) => {
    if (trend === "neutral") return "text-gray-500";
    const isGood = (trend === "up" && positive) || (trend === "down" && !positive);
    return isGood ? "text-green-600" : "text-red-600";
  };

  const arrTrend = calculateTrend(snapshot.arr, previousSnapshot?.arr);
  const revenueTrend = calculateTrend(snapshot.revenue, previousSnapshot?.revenue);
  const cashTrend = calculateTrend(snapshot.cash, previousSnapshot?.cash);
  const burnTrend = calculateTrend(snapshot.burn, previousSnapshot?.burn);

  const MetricRow = ({ label, value, trend, icon, positive = true }: {
    label: string;
    value: string;
    trend?: { trend: "up" | "down" | "neutral"; percent: number };
    icon: React.ReactNode;
    positive?: boolean;
  }) => (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`font-semibold ${compact ? "text-sm" : "text-base"}`}>{value}</span>
        {trend && previousSnapshot && (
          <div className={`flex items-center gap-1 text-xs ${getTrendColor(trend.trend, positive)}`}>
            {getTrendIcon(trend.trend)}
            <span>{Math.abs(trend.percent).toFixed(0)}%</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <Card className={compact ? "" : "border-2"}>
        <CardHeader className={compact ? "pb-3" : "pb-4"}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className={compact ? "text-base" : "text-xl"}>
                {new Date(snapshot.period).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </CardTitle>
              {!compact && snapshot.notes && (
                <CardDescription className="mt-2 text-sm">
                  {snapshot.notes}
                </CardDescription>
              )}
            </div>
            {canEdit && !compact && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -mt-1"
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          <MetricRow
            label="ARR"
            value={formatCurrency(snapshot.arr)}
            trend={arrTrend}
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <MetricRow
            label="Revenue"
            value={formatCurrency(snapshot.revenue)}
            trend={revenueTrend}
            icon={<DollarSign className="h-4 w-4" />}
          />
          <MetricRow
            label="Gross Margin"
            value={formatPercent(snapshot.gross_margin)}
            icon={<Percent className="h-4 w-4" />}
          />
          <MetricRow
            label="Cash"
            value={formatCurrency(snapshot.cash)}
            trend={cashTrend}
            icon={<Wallet className="h-4 w-4" />}
          />
          <MetricRow
            label="Burn"
            value={formatCurrency(snapshot.burn)}
            trend={burnTrend}
            icon={<TrendingDown className="h-4 w-4" />}
            positive={false}
          />
          <MetricRow
            label="Runway"
            value={formatDays(snapshot.runway_days)}
            icon={<Calendar className="h-4 w-4" />}
          />

          {compact && snapshot.notes && (
            <p className="text-xs text-muted-foreground pt-2 border-t">
              {snapshot.notes}
            </p>
          )}
        </CardContent>
      </Card>

      {!compact && (
        <FinancialSnapshotForm
          open={isEditing}
          onOpenChange={setIsEditing}
          snapshot={snapshot}
          onSuccess={() => {
            setIsEditing(false);
            onRefresh();
          }}
        />
      )}
    </>
  );
}
