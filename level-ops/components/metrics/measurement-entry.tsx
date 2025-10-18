"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/organization-context";

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

interface MeasurementEntryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kpi: KPI;
  onSuccess: () => void;
}

export function MeasurementEntry({ open, onOpenChange, kpi, onSuccess }: MeasurementEntryProps) {
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM format
  const [value, setValue] = useState("");
  const [varianceNote, setVarianceNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClient();
  const { currentOrg } = useOrganization();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Convert period (YYYY-MM) to first day of month for storage
      const periodDate = `${period}-01`;

      const { error } = await supabase
        .from("kpi_measurements")
        .insert({
          kpi_id: kpi.id,
          org_id: currentOrg.id,
          period: periodDate,
          value: parseFloat(value),
          variance_note: varianceNote || null,
          created_by: user.id,
        });

      if (error) throw error;

      // Reset form
      setPeriod(new Date().toISOString().slice(0, 7));
      setValue("");
      setVarianceNote("");
      onSuccess();
    } catch (error) {
      console.error("Error creating measurement:", error);
      alert("Failed to create measurement. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Measurement</DialogTitle>
            <DialogDescription>
              Add a new measurement for {kpi.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="period">Period</Label>
              <Input
                id="period"
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Select the month this measurement represents
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="value">
                Value {kpi.unit && `(${kpi.unit})`}
              </Label>
              <Input
                id="value"
                type="number"
                step="any"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
                placeholder="Enter measurement value"
              />
              {kpi.target && (
                <p className="text-xs text-muted-foreground">
                  Target: {kpi.target}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="variance-note">
                Variance Note <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="variance-note"
                value={varianceNote}
                onChange={(e) => setVarianceNote(e.target.value)}
                placeholder="Explain significant variance from target or trend..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Add context if this measurement differs significantly from expectations
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Measurement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
