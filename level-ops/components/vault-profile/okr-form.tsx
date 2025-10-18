"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/supabase/database.types";
import { useOrganization } from "@/lib/context/organization-context";

type OKR = Tables<"okrs">;

interface OKRFormProps {
  isOpen: boolean;
  onClose: () => void;
  okr: OKR | null;
  onSuccess: () => void;
}

const STATUS_OPTIONS = [
  { value: "not-started", label: "Not Started" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "at-risk", label: "At Risk" },
  { value: "cancelled", label: "Cancelled" },
];

export function OKRForm({ isOpen, onClose, okr, onSuccess }: OKRFormProps) {
  const [formData, setFormData] = useState({
    objective: "",
    key_result: "",
    status: "not-started",
    progress: 0,
    due_date: "",
    notes: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();
  const { currentOrg } = useOrganization();

  useEffect(() => {
    if (okr) {
      setFormData({
        objective: okr.objective || "",
        key_result: okr.key_result || "",
        status: okr.status || "not-started",
        progress: okr.progress || 0,
        due_date: okr.due_date || "",
        notes: okr.notes || "",
      });
    } else {
      setFormData({
        objective: "",
        key_result: "",
        status: "not-started",
        progress: 0,
        due_date: "",
        notes: "",
      });
    }
  }, [okr, isOpen]);

  const handleSave = async () => {
    if (!currentOrg) return;
    if (!formData.objective.trim() || !formData.key_result.trim()) {
      alert("Please fill in both objective and key result");
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const okrData = {
        ...formData,
        org_id: currentOrg.id,
        progress: Number(formData.progress),
        created_by: user.id,
      };

      if (okr) {
        // Update existing OKR
        const { error } = await supabase
          .from("okrs")
          .update(okrData)
          .eq("id", okr.id);

        if (error) throw error;
      } else {
        // Create new OKR
        const { error } = await supabase
          .from("okrs")
          .insert([okrData]);

        if (error) throw error;
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error saving OKR:", error);
      alert("Failed to save OKR. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{okr ? "Edit" : "Create"} OKR</DialogTitle>
          <DialogDescription>
            Define an objective and measurable key result
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 px-1">
          <div className="space-y-2">
            <Label htmlFor="objective">Objective *</Label>
            <Input
              id="objective"
              value={formData.objective}
              onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
              placeholder="e.g., Achieve product-market fit"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="key_result">Key Result *</Label>
            <textarea
              id="key_result"
              rows={3}
              value={formData.key_result}
              onChange={(e) => setFormData({ ...formData, key_result: e.target.value })}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              placeholder="e.g., Reach 1,000 active users with 40% weekly retention"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="progress">Progress (%)</Label>
              <Input
                id="progress"
                type="number"
                min="0"
                max="100"
                value={formData.progress}
                onChange={(e) => setFormData({ ...formData, progress: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="due_date">Due Date</Label>
            <Input
              id="due_date"
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              placeholder="Additional context or notes..."
            />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : okr ? "Update OKR" : "Create OKR"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
