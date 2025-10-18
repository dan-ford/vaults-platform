"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

interface KPIFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kpi?: KPI;
  onSuccess: () => void;
}

const CADENCE_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annual" },
];

const COMMON_UNITS = [
  { value: "USD", label: "USD ($)" },
  { value: "%", label: "Percentage (%)" },
  { value: "users", label: "Users" },
  { value: "customers", label: "Customers" },
  { value: "days", label: "Days" },
  { value: "hours", label: "Hours" },
  { value: "count", label: "Count" },
];

export function KPIForm({ open, onOpenChange, kpi, onSuccess }: KPIFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState("");
  const [customUnit, setCustomUnit] = useState("");
  const [target, setTarget] = useState("");
  const [cadence, setCadence] = useState("monthly");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClient();
  const { currentOrg } = useOrganization();

  const isEditing = !!kpi;

  // Load KPI data when editing
  useEffect(() => {
    if (kpi) {
      setName(kpi.name);
      setDescription(kpi.description || "");
      setCadence(kpi.cadence);
      setTarget(kpi.target?.toString() || "");

      // Check if unit is a common one
      const commonUnit = COMMON_UNITS.find(u => u.value === kpi.unit);
      if (commonUnit) {
        setUnit(kpi.unit || "");
        setCustomUnit("");
      } else {
        setUnit("custom");
        setCustomUnit(kpi.unit || "");
      }
    } else {
      // Reset form for creating
      setName("");
      setDescription("");
      setUnit("");
      setCustomUnit("");
      setTarget("");
      setCadence("monthly");
    }
  }, [kpi, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const finalUnit = unit === "custom" ? customUnit : unit;

      const kpiData = {
        org_id: currentOrg.id,
        name: name.trim(),
        description: description.trim() || null,
        unit: finalUnit || null,
        target: target ? parseFloat(target) : null,
        cadence,
        created_by: user.id,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("kpis")
          .update(kpiData)
          .eq("id", kpi.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("kpis")
          .insert(kpiData);

        if (error) throw error;
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving KPI:", error);
      alert(`Failed to ${isEditing ? "update" : "create"} KPI. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] flex flex-col sm:max-w-[600px]">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit KPI" : "Create KPI"}</DialogTitle>
            <DialogDescription>
              {isEditing ? "Update the details of this KPI" : "Define a new key performance indicator to track"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto flex-1 px-1 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Monthly Recurring Revenue, Customer Churn Rate"
                required
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this metric measure and why is it important?"
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger id="unit">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {COMMON_UNITS.map((u) => (
                      <SelectItem key={u.value} value={u.value}>
                        {u.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Custom...</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {unit === "custom" && (
                <div className="space-y-2">
                  <Label htmlFor="custom-unit">Custom Unit</Label>
                  <Input
                    id="custom-unit"
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value)}
                    placeholder="e.g., tickets, points"
                    maxLength={50}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="target">Target</Label>
                <Input
                  id="target"
                  type="number"
                  step="any"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="Optional target value"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cadence">
                Measurement Cadence <span className="text-destructive">*</span>
              </Label>
              <Select value={cadence} onValueChange={setCadence} required>
                <SelectTrigger id="cadence">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CADENCE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                How often do you measure this KPI?
              </p>
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
              {isSubmitting ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update KPI" : "Create KPI")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
