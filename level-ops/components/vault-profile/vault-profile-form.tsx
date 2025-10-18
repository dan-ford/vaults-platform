"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/supabase/database.types";
import { useOrganization } from "@/lib/context/organization-context";

type VaultProfile = Tables<"vault_profiles">;

interface VaultProfileFormProps {
  isOpen: boolean;
  onClose: () => void;
  profile: VaultProfile | null;
  onSuccess: () => void;
}

export function VaultProfileForm({ isOpen, onClose, profile, onSuccess }: VaultProfileFormProps) {
  const [formData, setFormData] = useState({
    legal_name: "",
    brand_name: "",
    mission: "",
    vision: "",
    industry: "",
    company_size: "",
    description: "",
  });
  const [values, setValues] = useState<string[]>([]);
  const [newValue, setNewValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();
  const { currentOrg } = useOrganization();

  useEffect(() => {
    if (profile) {
      setFormData({
        legal_name: profile.legal_name || "",
        brand_name: profile.brand_name || "",
        mission: profile.mission || "",
        vision: profile.vision || "",
        industry: profile.industry || "",
        company_size: profile.company_size || "",
        description: profile.description || "",
      });
      setValues((profile.values as string[]) || []);
    } else {
      // Reset for new profile
      setFormData({
        legal_name: "",
        brand_name: "",
        mission: "",
        vision: "",
        industry: "",
        company_size: "",
        description: "",
      });
      setValues([]);
    }
  }, [profile, isOpen]);

  const addValue = () => {
    if (newValue.trim() && !values.includes(newValue.trim())) {
      setValues([...values, newValue.trim()]);
      setNewValue("");
    }
  };

  const removeValue = (valueToRemove: string) => {
    setValues(values.filter(v => v !== valueToRemove));
  };

  const handleSave = async () => {
    if (!currentOrg) return;

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const profileData = {
        ...formData,
        values: values,
        vault_id: currentOrg.id,
        updated_by: user.id,
      };

      if (profile) {
        // Update existing profile
        const { error } = await supabase
          .from("vault_profiles")
          .update(profileData)
          .eq("id", profile.id);

        if (error) throw error;
      } else {
        // Create new profile
        const { error } = await supabase
          .from("vault_profiles")
          .insert([profileData]);

        if (error) throw error;
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error saving vault profile:", error);
      alert("Failed to save vault profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] flex flex-col max-w-2xl">
        <DialogHeader>
          <DialogTitle>{profile ? "Edit" : "Create"} Organization Profile</DialogTitle>
          <DialogDescription>
            Update your organization's mission, vision, and key information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 px-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="legal_name">Legal Name</Label>
              <Input
                id="legal_name"
                value={formData.legal_name}
                onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                placeholder="Acme Inc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand_name">Brand Name</Label>
              <Input
                id="brand_name"
                value={formData.brand_name}
                onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                placeholder="Acme"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mission">Mission</Label>
            <textarea
              id="mission"
              rows={3}
              value={formData.mission}
              onChange={(e) => setFormData({ ...formData, mission: e.target.value })}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              placeholder="Our mission is to..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vision">Vision</Label>
            <textarea
              id="vision"
              rows={3}
              value={formData.vision}
              onChange={(e) => setFormData({ ...formData, vision: e.target.value })}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              placeholder="We envision a world where..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="values">Core Values</Label>
            <div className="flex gap-2">
              <Input
                id="values"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addValue())}
                placeholder="Add a value (press Enter)"
              />
              <Button type="button" onClick={addValue} variant="outline">
                Add
              </Button>
            </div>
            {values.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {values.map((value, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {value}
                    <button
                      onClick={() => removeValue(value)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                placeholder="Technology, Finance, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_size">Company Size</Label>
              <Input
                id="company_size"
                value={formData.company_size}
                onChange={(e) => setFormData({ ...formData, company_size: e.target.value })}
                placeholder="1-10, 11-50, 51-200, etc."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              placeholder="Brief description of your organization..."
            />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Profile"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
