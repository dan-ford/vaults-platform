"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, CheckCircle2, Shield } from "lucide-react";

interface SealConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  secretTitle: string;
}

const SEAL_CHECKLIST = [
  {
    id: "confidential",
    label: "Is this information confidential?",
    description: "The information has commercial value and is not publicly known",
  },
  {
    id: "restricted",
    label: "Is access restricted to need-to-know?",
    description: "Only authorized individuals have access to this information",
  },
  {
    id: "marked",
    label: "Is it marked as confidential?",
    description: "The information is clearly labeled as confidential or trade secret",
  },
  {
    id: "value",
    label: "Does it have commercial value?",
    description: "The information provides a business advantage if kept secret",
  },
];

export function SealConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  secretTitle,
}: SealConfirmationDialogProps) {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [isSealing, setIsSealing] = useState(false);

  const allChecked = SEAL_CHECKLIST.every((item) => checkedItems[item.id]);

  const handleCheckItem = (id: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleConfirm = async () => {
    if (!allChecked) return;

    setIsSealing(true);
    try {
      await onConfirm();
      // Reset state on success
      setCheckedItems({});
      onOpenChange(false);
    } catch (error) {
      console.error("Error sealing secret:", error);
    } finally {
      setIsSealing(false);
    }
  };

  const handleCancel = () => {
    setCheckedItems({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] flex flex-col max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Seal as Trade Secret
          </DialogTitle>
          <DialogDescription>
            Sealing &quot;{secretTitle}&quot; will create a cryptographically timestamped,
            immutable version that serves as legal evidence of reasonable security measures.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 px-1">
          {/* Warning Banner */}
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-900">
              <p className="font-medium mb-1">Important: Reasonable Measures Checklist</p>
              <p>
                To maintain trade secret protection under DTSA (US) and the Trade Secrets
                Directive (EU/UK), you must take reasonable steps to keep the information
                secret. Please confirm the following:
              </p>
            </div>
          </div>

          {/* Checklist */}
          <div className="space-y-3">
            {SEAL_CHECKLIST.map((item) => (
              <label
                key={item.id}
                className="flex items-start gap-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    checked={checkedItems[item.id] || false}
                    onChange={() => handleCheckItem(item.id)}
                    className="h-4 w-4 text-primary focus:ring-2 focus:ring-primary border-gray-300 rounded"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{item.label}</span>
                    {checkedItems[item.id] && (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {item.description}
                  </p>
                </div>
              </label>
            ))}
          </div>

          {/* What happens when you seal */}
          <div className="border-t pt-4">
            <h4 className="font-medium text-sm mb-2">What happens when you seal:</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>A SHA-256 hash is computed to prove content integrity</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>An RFC 3161 timestamp is obtained from a trusted authority</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>An immutable version record is created (cannot be modified)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>All access is logged to the audit trail</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>A seal certificate is generated for your records</span>
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleCancel} disabled={isSealing}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!allChecked || isSealing}
            className="gap-2"
          >
            <Shield className="h-4 w-4" />
            {isSealing ? "Sealing..." : "Seal as Trade Secret"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
