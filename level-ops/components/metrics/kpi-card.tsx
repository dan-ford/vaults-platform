"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Plus, Pencil } from "lucide-react";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { MeasurementEntry } from "./measurement-entry";
import { KPIForm } from "./kpi-form";

type KPI = {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  unit: string | null;
  target: number | null;
  cadence: string;
  is_active: boolean | null;
};

type KPIMeasurement = {
  id: string;
  kpi_id: string;
  period: string;
  value: number;
  variance_note: string | null;
};

interface KPICardProps {
  kpi: KPI;
  measurements: KPIMeasurement[];
  onRefresh: () => void;
}

export function KPICard({ kpi, measurements, onRefresh }: KPICardProps) {
  const [isAddingMeasurement, setIsAddingMeasurement] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { canEdit } = usePermissions();

  const latestMeasurement = measurements[0];
  const previousMeasurement = measurements[1];

  // Calculate trend
  let trend: "up" | "down" | "neutral" = "neutral";
  let trendPercent = 0;

  if (latestMeasurement && previousMeasurement) {
    const diff = latestMeasurement.value - previousMeasurement.value;
    trendPercent = (diff / previousMeasurement.value) * 100;
    trend = diff > 0 ? "up" : diff < 0 ? "down" : "neutral";
  }

  // Calculate variance from target
  let variance: "above" | "below" | "on-target" = "on-target";
  let variancePercent = 0;

  if (latestMeasurement && kpi.target) {
    const diff = latestMeasurement.value - kpi.target;
    variancePercent = (diff / kpi.target) * 100;
    variance = diff > 0 ? "above" : diff < 0 ? "below" : "on-target";
  }

  const formatValue = (value: number) => {
    if (kpi.unit === "USD" || kpi.unit === "$") {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(value);
    }
    if (kpi.unit === "%") {
      return `${value.toFixed(1)}%`;
    }
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  };

  const getTrendIcon = () => {
    if (trend === "up") return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend === "down") return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getTrendColor = () => {
    if (trend === "up") return "text-green-600";
    if (trend === "down") return "text-red-600";
    return "text-gray-500";
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg">{kpi.name}</CardTitle>
              {kpi.description && (
                <CardDescription className="mt-1 text-sm">
                  {kpi.description}
                </CardDescription>
              )}
            </div>
            {canEdit && (
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
        <CardContent className="space-y-4">
          {latestMeasurement ? (
            <>
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <div className="text-3xl font-bold">
                    {formatValue(latestMeasurement.value)}
                  </div>
                  {previousMeasurement && (
                    <div className={`flex items-center gap-1 text-sm ${getTrendColor()}`}>
                      {getTrendIcon()}
                      <span>{Math.abs(trendPercent).toFixed(1)}%</span>
                    </div>
                  )}
                </div>

                {kpi.target && (
                  <div className="text-sm text-muted-foreground">
                    Target: {formatValue(kpi.target)}
                    {variance !== "on-target" && (
                      <Badge
                        variant={variance === "above" ? "default" : "destructive"}
                        className="ml-2"
                      >
                        {variance === "above" ? "+" : ""}
                        {variancePercent.toFixed(1)}%
                      </Badge>
                    )}
                  </div>
                )}

                {latestMeasurement.variance_note && (
                  <p className="text-sm text-muted-foreground border-l-2 border-muted pl-3">
                    {latestMeasurement.variance_note}
                  </p>
                )}

                <div className="text-xs text-muted-foreground">
                  Last updated:{" "}
                  {new Date(latestMeasurement.period).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })}
                </div>
              </div>

              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setIsAddingMeasurement(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Measurement
                </Button>
              )}
            </>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-3">No measurements yet</p>
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingMeasurement(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Measurement
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <MeasurementEntry
        open={isAddingMeasurement}
        onOpenChange={setIsAddingMeasurement}
        kpi={kpi}
        onSuccess={() => {
          setIsAddingMeasurement(false);
          onRefresh();
        }}
      />

      <KPIForm
        open={isEditing}
        onOpenChange={setIsEditing}
        kpi={kpi}
        onSuccess={() => {
          setIsEditing(false);
          onRefresh();
        }}
      />
    </>
  );
}
