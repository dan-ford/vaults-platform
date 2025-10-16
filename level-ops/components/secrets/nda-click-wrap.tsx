"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, CheckCircle2, FileText } from "lucide-react";

interface NDAClickWrapProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => Promise<void>;
  onDecline: () => void;
  secretTitle: string;
  vaultName: string;
}

export function NDAClickWrap({
  open,
  onOpenChange,
  onAccept,
  onDecline,
  secretTitle,
  vaultName,
}: NDAClickWrapProps) {
  const [hasRead, setHasRead] = useState(false);
  const [hasAgreed, setHasAgreed] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  const handleAccept = async () => {
    if (!hasRead || !hasAgreed) return;

    setIsAccepting(true);
    try {
      await onAccept();
      // Reset state on success
      setHasRead(false);
      setHasAgreed(false);
    } catch (error) {
      console.error("Error accepting NDA:", error);
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = () => {
    setHasRead(false);
    setHasAgreed(false);
    onDecline();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] flex flex-col max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Non-Disclosure Agreement (NDA)
          </DialogTitle>
          <DialogDescription>
            You must acknowledge this agreement before viewing confidential information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 px-1">
          {/* Warning Banner */}
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-900">
              <p className="font-medium">Confidential Information - Legal Agreement Required</p>
              <p className="mt-1">
                The information you are about to access is protected trade secret material.
                By proceeding, you agree to the terms below.
              </p>
            </div>
          </div>

          {/* Secret Info */}
          <div className="bg-gray-50 border rounded-lg p-4">
            <div className="text-sm space-y-1">
              <p><span className="font-semibold">Secret:</span> {secretTitle}</p>
              <p><span className="font-semibold">Vault:</span> {vaultName}</p>
              <p><span className="font-semibold">Classification:</span> Trade Secret</p>
            </div>
          </div>

          {/* NDA Terms */}
          <div className="border rounded-lg p-6 bg-white space-y-4 text-sm">
            <h3 className="font-bold text-base">CONFIDENTIAL INFORMATION NON-DISCLOSURE AGREEMENT</h3>

            <p>
              This Non-Disclosure Agreement (the "Agreement") is entered into as of the date of acceptance below
              by and between <strong>{vaultName}</strong> ("Disclosing Party") and the undersigned individual
              ("Receiving Party").
            </p>

            <div>
              <h4 className="font-semibold mb-2">1. Confidential Information</h4>
              <p>
                "Confidential Information" means the trade secret information titled "{secretTitle}" and all
                related materials, data, specifications, and documentation, whether written, oral, or electronic.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">2. Obligations</h4>
              <p>The Receiving Party agrees to:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Hold the Confidential Information in strict confidence</li>
                <li>Not disclose the Confidential Information to any third party without prior written consent</li>
                <li>Use the Confidential Information solely for authorized business purposes</li>
                <li>Take reasonable measures to protect the Confidential Information from unauthorized access</li>
                <li>Return or destroy all copies upon request or termination of access</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">3. Exclusions</h4>
              <p>Obligations do not apply to information that:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Is or becomes publicly available through no fault of the Receiving Party</li>
                <li>Was lawfully possessed by the Receiving Party prior to disclosure</li>
                <li>Is independently developed by the Receiving Party without use of Confidential Information</li>
                <li>Is required to be disclosed by law or court order (with prior notice to Disclosing Party)</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">4. Term</h4>
              <p>
                This Agreement shall remain in effect for as long as the Receiving Party has access to the
                Confidential Information, and obligations shall survive for a period of five (5) years thereafter.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">5. Remedies</h4>
              <p>
                The Receiving Party acknowledges that unauthorized disclosure would cause irreparable harm for
                which monetary damages would be inadequate. The Disclosing Party shall be entitled to seek
                equitable relief, including injunction, in addition to all other remedies available at law or in equity.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">6. Audit Trail</h4>
              <p>
                The Receiving Party acknowledges that all access to Confidential Information is logged and
                monitored, including IP address, timestamp, and actions taken. This audit trail may be used as
                evidence in any legal proceedings.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">7. Governing Law</h4>
              <p>
                This Agreement shall be governed by the Defend Trade Secrets Act (DTSA), the Uniform Trade
                Secrets Act (UTSA), and applicable state and federal laws.
              </p>
            </div>
          </div>

          {/* Acknowledgment Checkboxes */}
          <div className="space-y-3 border-t pt-4">
            <label className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  checked={hasRead}
                  onChange={(e) => setHasRead(e.target.checked)}
                  className="h-4 w-4 text-primary focus:ring-2 focus:ring-primary border-gray-300 rounded"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">I have read and understood this agreement</span>
                  {hasRead && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  I have carefully reviewed all terms and conditions above
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  checked={hasAgreed}
                  onChange={(e) => setHasAgreed(e.target.checked)}
                  className="h-4 w-4 text-primary focus:ring-2 focus:ring-primary border-gray-300 rounded"
                  disabled={!hasRead}
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">I agree to be bound by this NDA</span>
                  {hasAgreed && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  I accept the obligations and acknowledge the consequences of unauthorized disclosure
                </p>
              </div>
            </label>
          </div>

          {/* Legal Notice */}
          <div className="bg-gray-50 border rounded-lg p-4 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground mb-2">Electronic Signature Notice</p>
            <p>
              By clicking "I Accept and Acknowledge" below, you are providing your electronic signature
              to this agreement. Your acceptance, along with your IP address, timestamp, and user information,
              will be recorded and may be used as evidence of your agreement to these terms.
            </p>
            <p className="mt-2">
              This agreement is legally binding and enforceable under the Electronic Signatures in Global
              and National Commerce Act (ESIGN Act) and applicable state laws.
            </p>
          </div>
        </div>

        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" onClick={handleDecline} disabled={isAccepting}>
            Decline
          </Button>
          <Button
            onClick={handleAccept}
            disabled={!hasRead || !hasAgreed || isAccepting}
            className="gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            {isAccepting ? "Recording..." : "I Accept and Acknowledge"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
