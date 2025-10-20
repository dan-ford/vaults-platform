"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface FinancialDocumentUploadDialogProps {
  orgId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete?: () => void;
}

const SUPPORTED_FILE_TYPES = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  csv: "text/csv",
};

const MAX_FILE_SIZE = {
  xlsx: 25 * 1024 * 1024, // 25MB
  xls: 25 * 1024 * 1024, // 25MB
  csv: 50 * 1024 * 1024, // 50MB
};

export function FinancialDocumentUploadDialog({
  orgId,
  open,
  onOpenChange,
  onUploadComplete,
}: FinancialDocumentUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [subcategory, setSubcategory] = useState<string>("financial_model");
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const supabase = createClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const fileExt = selectedFile.name.split(".").pop()?.toLowerCase();
    if (!fileExt || !["xlsx", "xls", "csv"].includes(fileExt)) {
      toast.error("Invalid file type. Please upload XLS, XLSX, or CSV files only.");
      return;
    }

    // Validate file size
    const maxSize = MAX_FILE_SIZE[fileExt as keyof typeof MAX_FILE_SIZE];
    if (selectedFile.size > maxSize) {
      toast.error(
        `File too large. Maximum size for ${fileExt.toUpperCase()} is ${maxSize / 1024 / 1024}MB.`
      );
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file to upload");
      return;
    }

    setUploading(true);

    try {
      // Get current user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Not authenticated");
      }

      // Upload file to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `${orgId}/financial/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("vault-documents")
        .upload(filePath, file);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Create document record
      const { data: document, error: documentError } = await supabase
        .from("documents")
        .insert({
          org_id: orgId,
          name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          category: "financial",
          subcategory: subcategory,
          created_by: user.id,
        })
        .select()
        .single();

      if (documentError || !document) {
        throw new Error(`Document creation failed: ${documentError?.message}`);
      }

      setUploading(false);
      setAnalyzing(true);

      // Trigger financial analysis via API
      const response = await fetch("/api/finance/analyze-document", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          document_id: document.id,
          org_id: orgId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Analysis failed");
      }

      const result = await response.json();

      toast.success("Financial document uploaded successfully! Analysis in progress...");

      // Close dialog and reset
      setFile(null);
      setSubcategory("financial_model");
      setAnalyzing(false);
      onOpenChange(false);

      // Notify parent to refresh
      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to upload document"
      );
      setUploading(false);
      setAnalyzing(false);
    }
  };

  const isProcessing = uploading || analyzing;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] flex flex-col sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Financial Document</DialogTitle>
          <DialogDescription>
            Upload an XLS, XLSX, or CSV file containing financial metrics. AI will
            automatically extract ARR, revenue, gross margin, cash, and burn rate.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 px-1">
          {/* File Input */}
          <div className="space-y-2">
            <Label htmlFor="file">Financial Document</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <input
                id="file"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                disabled={isProcessing}
                className="hidden"
              />
              <label
                htmlFor="file"
                className="cursor-pointer flex flex-col items-center space-y-2"
              >
                {file ? (
                  <>
                    <FileSpreadsheet className="h-12 w-12 text-green-600" />
                    <div className="text-sm font-medium">{file.name}</div>
                    <div className="text-xs text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </>
                ) : (
                  <>
                    <Upload className="h-12 w-12 text-gray-400" />
                    <div className="text-sm font-medium">
                      Click to upload or drag and drop
                    </div>
                    <div className="text-xs text-gray-500">
                      XLS, XLSX, or CSV (max 25-50MB)
                    </div>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Subcategory Selection */}
          <div className="space-y-2">
            <Label htmlFor="subcategory">Document Type</Label>
            <Select
              value={subcategory}
              onValueChange={setSubcategory}
              disabled={isProcessing}
            >
              <SelectTrigger id="subcategory">
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="financial_model">Financial Model</SelectItem>
                <SelectItem value="budget">Budget</SelectItem>
                <SelectItem value="accounts">Accounts</SelectItem>
                <SelectItem value="bank_statement">Bank Statement</SelectItem>
                <SelectItem value="forecast">Forecast</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm">
            <p className="font-medium text-blue-900 mb-1">
              What happens next?
            </p>
            <ul className="text-blue-800 space-y-1 list-disc list-inside">
              <li>AI analyzes your document and extracts financial metrics</li>
              <li>You'll review the extracted data and confidence scores</li>
              <li>Approve to create a financial snapshot</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!file || isProcessing}>
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {uploading ? "Uploading..." : "Analyzing..."}
              </>
            ) : (
              "Upload & Analyze"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
