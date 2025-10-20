"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  MoreVertical,
  Eye,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Tables } from "@/lib/supabase/database.types";
import { formatDistanceToNow } from "date-fns";

type FinancialAnalysis = Tables<"financial_analyses">;

interface AnalysisListProps {
  analyses: FinancialAnalysis[];
  onViewDetails?: (analysis: FinancialAnalysis) => void;
  onDelete?: (analysisId: string) => void;
  onRefresh?: () => void;
}

const statusConfig = {
  pending: {
    label: "Pending",
    variant: "secondary" as const,
    icon: Clock,
    color: "text-gray-600",
  },
  processing: {
    label: "Processing",
    variant: "default" as const,
    icon: RefreshCw,
    color: "text-blue-600",
  },
  completed: {
    label: "Completed",
    variant: "default" as const,
    icon: CheckCircle2,
    color: "text-green-600",
  },
  review: {
    label: "Needs Review",
    variant: "secondary" as const,
    icon: AlertTriangle,
    color: "text-yellow-600",
  },
  failed: {
    label: "Failed",
    variant: "destructive" as const,
    icon: XCircle,
    color: "text-red-600",
  },
};

export function AnalysisList({
  analyses,
  onViewDetails,
  onDelete,
  onRefresh,
}: AnalysisListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const supabase = createClient();

  const handleDelete = async (analysisId: string) => {
    if (!confirm("Are you sure you want to delete this analysis?")) {
      return;
    }

    setDeletingId(analysisId);

    try {
      const { error } = await supabase
        .from("financial_analyses")
        .delete()
        .eq("id", analysisId);

      if (error) {
        throw new Error(`Failed to delete: ${error.message}`);
      }

      toast.success("Analysis deleted successfully");

      if (onDelete) {
        onDelete(analysisId);
      }

      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete analysis"
      );
    } finally {
      setDeletingId(null);
    }
  };

  const getConfidenceColor = (score: number | null) => {
    if (!score) return "text-gray-500";
    if (score >= 0.8) return "text-green-600";
    if (score >= 0.5) return "text-yellow-600";
    return "text-red-600";
  };

  if (analyses.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-gray-50">
        <Clock className="mx-auto h-12 w-12 text-gray-400 mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          No analyses yet
        </h3>
        <p className="text-sm text-gray-500">
          Upload a financial document to get started
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead>File Type</TableHead>
            <TableHead>Confidence</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Processing Time</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {analyses.map((analysis) => {
            const status = statusConfig[analysis.analysis_status as keyof typeof statusConfig] || statusConfig.pending;
            const StatusIcon = status.icon;

            return (
              <TableRow key={analysis.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <StatusIcon className={`h-4 w-4 ${status.color}`} />
                    <Badge variant={status.variant}>{status.label}</Badge>
                    {analysis.approved === true && (
                      <Badge variant="default" className="bg-green-600">
                        Approved
                      </Badge>
                    )}
                    {analysis.approved === false && (
                      <Badge variant="destructive">Rejected</Badge>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                    {analysis.file_type.toUpperCase()}
                  </code>
                </TableCell>

                <TableCell>
                  {analysis.confidence_score !== null ? (
                    <span
                      className={`font-medium ${getConfidenceColor(
                        analysis.confidence_score
                      )}`}
                    >
                      {(analysis.confidence_score * 100).toFixed(0)}%
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </TableCell>

                <TableCell className="text-sm text-gray-600">
                  {formatDistanceToNow(new Date(analysis.created_at), {
                    addSuffix: true,
                  })}
                </TableCell>

                <TableCell className="text-sm">
                  {analysis.processing_time_ms
                    ? `${(analysis.processing_time_ms / 1000).toFixed(1)}s`
                    : "-"}
                </TableCell>

                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={deletingId === analysis.id}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {analysis.analysis_status !== "failed" && (
                        <DropdownMenuItem
                          onClick={() =>
                            onViewDetails && onViewDetails(analysis)
                          }
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => handleDelete(analysis.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
