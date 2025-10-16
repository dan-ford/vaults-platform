"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, ShieldAlert, Database } from "lucide-react";

interface ErrorStateProps {
  title: string;
  message: string;
  onRetry?: () => void;
  type?: "error" | "permission" | "notFound" | "database";
}

/**
 * Reusable error state component for displaying different types of errors
 */
export function ErrorState({ title, message, onRetry, type = "error" }: ErrorStateProps) {
  const icons = {
    error: AlertTriangle,
    permission: ShieldAlert,
    notFound: Database,
    database: Database,
  };

  const colors = {
    error: "bg-red-100 text-red-600",
    permission: "bg-yellow-100 text-yellow-600",
    notFound: "bg-gray-100 text-gray-600",
    database: "bg-orange-100 text-orange-600",
  };

  const Icon = icons[type];

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="max-w-md w-full p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className={`rounded-full p-3 ${colors[type]}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
          {onRetry && (
            <Button onClick={onRetry} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

/**
 * Loading state component for consistent loading UI
 */
export function LoadingState({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

/**
 * Empty state component for when no data is available
 */
export function EmptyState({
  title,
  message,
  action,
  actionLabel,
}: {
  title: string;
  message: string;
  action?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="max-w-md w-full p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="rounded-full bg-muted p-3">
            <Database className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
          {action && actionLabel && (
            <Button onClick={action} className="w-full">
              {actionLabel}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
