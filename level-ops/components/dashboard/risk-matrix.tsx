"use client";

import { Card } from "@/components/ui/card";
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useOrganization } from '@/lib/context/organization-context';

interface Risk {
  id: string;
  title: string;
  impact: string;
  probability: string;
}

const IMPACT_MAP: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const PROBABILITY_MAP: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

export function RiskMatrix() {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentOrg } = useOrganization();
  const supabase = createClient();

  useEffect(() => {
    const loadRisks = async () => {
      if (!currentOrg) {
        setIsLoading(false);
        return;
      }

      const { data } = await supabase
        .from('risks')
        .select('id, title, impact, probability')
        .eq('org_id', currentOrg.id);

      if (data) {
        setRisks(data);
      }
      setIsLoading(false);
    };

    loadRisks();
  }, [currentOrg?.id]);

  // Transform risks into scatter plot data
  const chartData = risks.map(risk => ({
    x: PROBABILITY_MAP[risk.probability] || 2,
    y: IMPACT_MAP[risk.impact] || 2,
    z: 100, // Size of bubble
    title: risk.title,
    impact: risk.impact,
    probability: risk.probability,
  }));

  // Color based on severity (probability * impact)
  const getColor = (x: number, y: number) => {
    const severity = x * y;
    if (severity >= 9) return 'rgba(239, 68, 68, 0.8)'; // Critical - red
    if (severity >= 6) return 'rgba(38, 172, 226, 1)'; // High - primary blue
    if (severity >= 3) return 'rgba(38, 172, 226, 0.6)'; // Medium - lighter blue
    return 'rgba(107, 114, 128, 0.6)'; // Low - grey
  };

  if (isLoading) {
    return (
      <Card className="p-6 h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading risks...</p>
        </div>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className="p-6 h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">No risks to display</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 animate-fade-in">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">Risk Matrix</h3>
        <p className="text-sm text-muted-foreground">Impact vs Probability</p>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgb(229, 231, 235)" />
            <XAxis
              type="number"
              dataKey="x"
              name="Probability"
              domain={[0.5, 3.5]}
              ticks={[1, 2, 3]}
              tickFormatter={(value) => {
                const labels = ['', 'Low', 'Medium', 'High'];
                return labels[value] || '';
              }}
              stroke="rgb(107, 114, 128)"
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Impact"
              domain={[0.5, 4.5]}
              ticks={[1, 2, 3, 4]}
              tickFormatter={(value) => {
                const labels = ['', 'Low', 'Medium', 'High', 'Critical'];
                return labels[value] || '';
              }}
              stroke="rgb(107, 114, 128)"
            />
            <ZAxis type="number" dataKey="z" range={[100, 400]} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
                      <p className="font-semibold text-sm text-foreground mb-1">{data.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Impact: <span className="font-medium text-foreground">{data.impact}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Probability: <span className="font-medium text-foreground">{data.probability}</span>
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Scatter
              data={chartData}
              fill="#26ace2"
              animationBegin={0}
              animationDuration={800}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.x, entry.y)} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex justify-center items-center gap-2">
          <span className="text-sm text-muted-foreground">Total Risks:</span>
          <span className="text-lg font-bold text-foreground">{risks.length}</span>
        </div>
      </div>
    </Card>
  );
}
