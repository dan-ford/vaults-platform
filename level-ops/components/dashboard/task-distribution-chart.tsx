"use client";

import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface TaskDistributionChartProps {
  data: {
    todo: number;
    in_progress: number;
    blocked: number;
    done: number;
  };
}

const COLORS = {
  todo: 'rgba(107, 114, 128, 0.8)', // muted grey
  in_progress: 'rgba(38, 172, 226, 1)', // primary blue
  blocked: 'rgba(239, 68, 68, 0.8)', // destructive red
  done: 'rgba(38, 172, 226, 0.4)', // light primary
};

const STATUS_LABELS = {
  todo: 'To Do',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  done: 'Done',
};

export function TaskDistributionChart({ data }: TaskDistributionChartProps) {
  // Filter out zero values and transform data
  const chartData = Object.entries(data)
    .filter(([_, value]) => value > 0)
    .map(([key, value]) => ({
      name: STATUS_LABELS[key as keyof typeof STATUS_LABELS],
      value,
      key,
    }));

  // If no data, show empty state
  if (chartData.length === 0) {
    return (
      <Card className="p-6 h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">No task data available</p>
        </div>
      </Card>
    );
  }

  const totalTasks = chartData.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <Card className="p-6 animate-fade-in">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">Task Distribution</h3>
        <p className="text-sm text-muted-foreground">Breakdown by status</p>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              animationBegin={0}
              animationDuration={800}
            >
              {chartData.map((entry) => (
                <Cell
                  key={`cell-${entry.key}`}
                  fill={COLORS[entry.key as keyof typeof COLORS]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid rgb(229, 231, 235)',
                borderRadius: '8px',
                padding: '8px 12px'
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value, entry: any) => (
                <span className="text-sm text-foreground">
                  {value} ({entry.payload.value})
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex justify-center items-center gap-2">
          <span className="text-sm text-muted-foreground">Total Tasks:</span>
          <span className="text-lg font-bold text-foreground">{totalTasks}</span>
        </div>
      </div>
    </Card>
  );
}
