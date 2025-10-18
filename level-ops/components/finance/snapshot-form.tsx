"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/organization-context";

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

interface FinancialSnapshotFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshot?: FinancialSnapshot;
  onSuccess: () => void;
}

export function FinancialSnapshotForm({ open, onOpenChange, snapshot, onSuccess }: FinancialSnapshotFormProps) {
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM format
  const [arr, setArr] = useState("");
  const [revenue, setRevenue] = useState("");
  const [grossMargin, setGrossMargin] = useState("");
  const [cash, setCash] = useState("");
  const [burn, setBurn] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClient();
  const { currentOrg } = useOrganization();

  const isEditing = !!snapshot;

  // Calculate runway automatically
  const calculateRunway = () => {
    const cashValue = parseFloat(cash);
    const burnValue = parseFloat(burn);
    if (cashValue && burnValue && burnValue > 0) {
      return Math.floor((cashValue / burnValue) * 30); // Convert months to days
    }
    return null;
  };

  // Load snapshot data when editing
  useEffect(() => {
    if (snapshot) {
      setPeriod(snapshot.period.slice(0, 7)); // Extract YYYY-MM from YYYY-MM-DD
      setArr(snapshot.arr?.toString() || "");
      setRevenue(snapshot.revenue?.toString() || "");
      setGrossMargin(snapshot.gross_margin?.toString() || "");
      setCash(snapshot.cash?.toString() || "");
      setBurn(snapshot.burn?.toString() || "");
      setNotes(snapshot.notes || "");
    } else {
      // Reset form for creating
      setPeriod(new Date().toISOString().slice(0, 7));
      setArr("");
      setRevenue("");
      setGrossMargin("");
      setCash("");
      setBurn("");
      setNotes("");
    }
  }, [snapshot, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Convert period (YYYY-MM) to last day of month for storage
      const year = parseInt(period.split("-")[0]);
      const month = parseInt(period.split("-")[1]);
      const lastDay = new Date(year, month, 0).getDate();
      const periodDate = `${period}-${String(lastDay).padStart(2, "0")}`;

      const snapshotData = {
        org_id: currentOrg.id,
        period: periodDate,
        arr: arr ? parseFloat(arr) : null,
        revenue: revenue ? parseFloat(revenue) : null,
        gross_margin: grossMargin ? parseFloat(grossMargin) : null,
        cash: cash ? parseFloat(cash) : null,
        burn: burn ? parseFloat(burn) : null,
        runway_days: calculateRunway(),
        notes: notes.trim() || null,
        created_by: user.id,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("financial_snapshots")
          .update(snapshotData)
          .eq("id", snapshot.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("financial_snapshots")
          .insert(snapshotData);

        if (error) throw error;
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving financial snapshot:", error);
      alert(`Failed to ${isEditing ? "update" : "create"} financial snapshot. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] flex flex-col sm:max-w-[600px]">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Financial Snapshot" : "Create Financial Snapshot"}</DialogTitle>
            <DialogDescription>
              {isEditing ? "Update the financial metrics for this period" : "Record financial metrics for a specific month"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto flex-1 px-1 py-4">
            <div className="space-y-2">
              <Label htmlFor="period">
                Period <span className="text-destructive">*</span>
              </Label>
              <Input
                id="period"
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Select the month for this financial snapshot
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="arr">ARR (Annual Recurring Revenue)</Label>
                <Input
                  id="arr"
                  type="number"
                  step="0.01"
                  min="0"
                  value={arr}
                  onChange={(e) => setArr(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="revenue">Monthly Revenue</Label>
                <Input
                  id="revenue"
                  type="number"
                  step="0.01"
                  min="0"
                  value={revenue}
                  onChange={(e) => setRevenue(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gross-margin">Gross Margin (%)</Label>
              <Input
                id="gross-margin"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={grossMargin}
                onChange={(e) => setGrossMargin(e.target.value)}
                placeholder="0.0"
              />
              <p className="text-xs text-muted-foreground">
                Enter as percentage (e.g., 75 for 75%)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cash">Cash Balance</Label>
                <Input
                  id="cash"
                  type="number"
                  step="0.01"
                  min="0"
                  value={cash}
                  onChange={(e) => setCash(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="burn">Monthly Burn Rate</Label>
                <Input
                  id="burn"
                  type="number"
                  step="0.01"
                  min="0"
                  value={burn}
                  onChange={(e) => setBurn(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            {cash && burn && parseFloat(burn) > 0 && (
              <div className="rounded-md bg-muted p-3">
                <p className="text-sm text-muted-foreground">
                  Calculated Runway:{" "}
                  <span className="font-semibold text-foreground">
                    {calculateRunway()} days ({Math.floor((calculateRunway() || 0) / 30)} months)
                  </span>
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Commentary on financial performance, significant changes, or context..."
                rows={4}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update Snapshot" : "Create Snapshot")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
