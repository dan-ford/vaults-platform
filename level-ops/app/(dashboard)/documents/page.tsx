"use client";

import { useState, useEffect } from "react";
import { useCopilotAction, useCopilotReadable } from "@copilotkit/react-core";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, FileStack, Download, Trash2, Upload, Eye, List, MessageSquare, ArrowUp, ArrowDown, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useOrganization } from "@/lib/context/organization-context";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { PermissionGuard, RoleBadge } from "@/components/permissions";

type Document = {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  category: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  metadata: any;
  text_content: string | null;
};

type DocumentSection = {
  id: string;
  document_id: string;
  org_id: string;
  title: string;
  content: string;
  display_order: number;
  questions_answers: QAPair[];
  metadata: any;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type QAPair = {
  question: string;
  answer: string;
  answered_by: string | null;
  answered_at: string | null;
};

const CATEGORIES = [
  { value: "general", label: "General", color: "bg-slate-100 text-slate-800 border-slate-200" },
  { value: "contract", label: "Contract", color: "bg-slate-200 text-slate-900 border-slate-300" },
  { value: "proposal", label: "Proposal", color: "bg-primary/10 text-primary border-primary/20" },
  { value: "report", label: "Report", color: "bg-slate-100 text-slate-700 border-slate-200" },
  { value: "specification", label: "Specification", color: "bg-slate-200 text-slate-800 border-slate-300" },
  { value: "other", label: "Other", color: "bg-gray-100 text-gray-700 border-gray-200" },
];

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newDocument, setNewDocument] = useState({
    name: "",
    description: "",
    category: "general"
  });
  const [deletingDocument, setDeletingDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Sections state
  const [viewingSections, setViewingSections] = useState<Document | null>(null);
  const [sections, setSections] = useState<DocumentSection[]>([]);
  const [editingSection, setEditingSection] = useState<DocumentSection | null>(null);
  const [sectionTitle, setSectionTitle] = useState("");
  const [sectionContent, setSectionContent] = useState("");

  // Q&A state
  const [qaSection, setQaSection] = useState<DocumentSection | null>(null);
  const [newQuestion, setNewQuestion] = useState("");
  const [answeringQA, setAnsweringQA] = useState<{ sectionId: string; qaIndex: number } | null>(null);
  const [qaAnswer, setQaAnswer] = useState("");

  const supabase = createClient();
  const { currentOrg } = useOrganization();
  const { hasPermission, role, canEdit, isViewer } = usePermissions();

  // Load documents function
  const loadDocuments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !currentOrg) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("org_id", currentOrg.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading documents:", error);
      } else if (data) {
        setDocuments(data);
      }
    } catch (error) {
      console.error("Error in loadDocuments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load documents on mount and when page becomes visible
  useEffect(() => {
    if (!currentOrg) return;
    loadDocuments();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadDocuments();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [supabase, currentOrg?.id]);

  // Realtime subscription for live updates
  useEffect(() => {
    if (!currentOrg) return;

    const channel = supabase
      .channel('documents-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents',
          filter: `org_id=eq.${currentOrg.id}`,
        },
        (payload: RealtimePostgresChangesPayload<Database['public']['Tables']['documents']['Row']>) => {
          if (payload.eventType === 'INSERT') {
            setDocuments(current => [payload.new as Document, ...current]);
          } else if (payload.eventType === 'UPDATE') {
            setDocuments(current => current.map(d => d.id === payload.new.id ? payload.new as Document : d));
          } else if (payload.eventType === 'DELETE') {
            setDocuments(current => current.filter(d => d.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, currentOrg?.id]);

  // Make documents readable to the AI with full text content
  useCopilotReadable({
    description: "The current list of project documents with their full text content. Use this to answer questions about document contents.",
    value: documents.map(doc => ({
      id: doc.id,
      name: doc.name,
      description: doc.description,
      category: doc.category,
      created_at: doc.created_at,
      text_content: doc.text_content, // Full PDF text content
    })),
  });

  // AI action to search documents
  useCopilotAction({
    name: "searchDocuments",
    description: "Search for documents by name, category, or description",
    parameters: [
      {
        name: "query",
        type: "string",
        description: "Search query to find documents",
        required: true,
      },
      {
        name: "category",
        type: "string",
        description: "Optional category filter (general, contract, proposal, report, specification, other)",
        required: false,
      },
    ],
    handler: async ({ query, category }) => {
      const filtered = documents.filter(doc => {
        const matchesQuery = doc.name.toLowerCase().includes(query.toLowerCase()) ||
          (doc.description?.toLowerCase().includes(query.toLowerCase()) || false);
        const matchesCategory = !category || doc.category === category;
        return matchesQuery && matchesCategory;
      });
      return `Found ${filtered.length} document(s): ${filtered.map(d => d.name).join(", ")}`;
    },
  });

  // AI action to list documents by category
  useCopilotAction({
    name: "listDocumentsByCategory",
    description: "Get all documents filtered by category",
    parameters: [
      {
        name: "category",
        type: "string",
        description: "Category to filter by (general, contract, proposal, report, specification, other)",
        required: true,
      },
    ],
    handler: async ({ category }) => {
      const filtered = documents.filter(d => d.category === category);
      return `Found ${filtered.length} document(s) in category "${category}": ${filtered.map(d => d.name).join(", ")}`;
    },
  });

  // AI action to download a document
  useCopilotAction({
    name: "downloadDocument",
    description: "Download a document file to the user's computer. ONLY use this when the user explicitly asks to download, save, or export a document file. Do NOT use this for reading or analyzing document content.",
    parameters: [
      {
        name: "documentName",
        type: "string",
        description: "Name of the document to download",
        required: true,
      },
    ],
    handler: async ({ documentName }) => {
      const doc = documents.find(d =>
        d.name.toLowerCase().includes(documentName.toLowerCase()) ||
        d.id === documentName
      );

      if (!doc) {
        return `Document "${documentName}" not found. Available documents: ${documents.map(d => d.name).join(", ")}`;
      }

      await handleDownloadDocument(doc);
      return `Successfully downloaded "${doc.name}"`;
    },
  });

  // AI action to delete a document
  useCopilotAction({
    name: "deleteDocument",
    description: "Delete a document permanently from the system. ONLY use this when the user explicitly asks to delete or remove a document. This is a destructive action.",
    parameters: [
      {
        name: "documentName",
        type: "string",
        description: "Name of the document to delete",
        required: true,
      },
    ],
    handler: async ({ documentName }) => {
      const doc = documents.find(d =>
        d.name.toLowerCase().includes(documentName.toLowerCase()) ||
        d.id === documentName
      );

      if (!doc) {
        return `Document "${documentName}" not found. Available documents: ${documents.map(d => d.name).join(", ")}`;
      }

      setDeletingDocument(doc);
      await handleDeleteDocument();
      return `Successfully deleted "${doc.name}"`;
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (file.type !== 'application/pdf') {
        alert('Please select a PDF file');
        return;
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
      setNewDocument({ ...newDocument, name: file.name.replace('.pdf', '') });
    }
  };

  const handleUploadDocument = async () => {
    if (!selectedFile || !currentOrg) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setIsUploading(true);

    try {
      // Upload file to Supabase Storage first
      const filePath = `tenants/${currentOrg.id}/${Date.now()}-${selectedFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Extract text from PDF via API route
      let textContent = null;
      try {
        const formData = new FormData();
        formData.append('file', selectedFile);

        const response = await fetch('/api/extract-pdf-text', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          textContent = data.text;
        }
      } catch (pdfError) {
        console.error("Error extracting PDF text:", pdfError);
        // Continue upload even if text extraction fails
      }

      // Create document record in database with text content
      const { data: insertedDoc, error: dbError } = await supabase
        .from("documents")
        .insert({
          name: newDocument.name,
          description: newDocument.description || null,
          category: newDocument.category,
          file_path: filePath,
          file_size: selectedFile.size,
          mime_type: selectedFile.type,
          org_id: currentOrg.id,
          tenant_id: null, // Using organizations, not tenants
          created_by: user.id,
          text_content: textContent,
        } as any)
        .select('*')
        .single();

      if (dbError) {
        console.error("Database insert error:", {
          message: dbError.message,
          details: dbError.details,
          hint: dbError.hint,
          code: dbError.code
        });
        throw dbError;
      }

      // Trigger RAG ingestion via webhook (async, don't wait)
      if (insertedDoc) {
        const doc = insertedDoc as Document;
        fetch('/api/webhooks/document-uploaded', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            document_id: doc.id,
            org_id: currentOrg.id,
            priority: 'normal'
          })
        }).catch(err => {
          console.error('Failed to trigger RAG ingestion:', err);
          // Don't block upload on webhook failure
        });
      }

      // Reset form
      setNewDocument({ name: "", description: "", category: "general" });
      setSelectedFile(null);
      setIsUploading(false);

      // Reset file input
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error) {
      console.error("Error uploading document:", error);
      setIsUploading(false);
      alert('Failed to upload document. Please try again.');
    }
  };

  const handleDownloadDocument = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(doc.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name + '.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading document:", error);
      alert('Failed to download document. Please try again.');
    }
  };

  const handleDeleteDocument = async () => {
    if (!deletingDocument) return;

    try {
      // Delete file from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([deletingDocument.file_path]);

      if (storageError) throw storageError;

      // Delete record from database
      const { error: dbError } = await supabase
        .from("documents")
        .delete()
        .eq("id", deletingDocument.id);

      if (dbError) throw dbError;

      setDocuments(documents.filter(d => d.id !== deletingDocument.id));
      setDeletingDocument(null);
    } catch (error) {
      console.error("Error deleting document:", error);
      alert('Failed to delete document. Please try again.');
    }
  };

  const getCategoryColor = (category: string) => {
    const cat = CATEGORIES.find(c => c.value === category);
    return cat?.color || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Invalid date";
    }
  };

  // ===== SECTIONS FUNCTIONS =====
  const loadSections = async (documentId: string) => {
    try {
      const { data, error } = await supabase
        .from("document_sections")
        .select("*")
        .eq("document_id", documentId)
        .order("display_order", { ascending: true });

      if (error) {
        console.error("Error loading sections:", error);
      } else if (data) {
        setSections(data as DocumentSection[]);
      }
    } catch (error) {
      console.error("Error in loadSections:", error);
    }
  };

  const handleViewSections = (doc: Document) => {
    setViewingSections(doc);
    loadSections(doc.id);
  };

  const handleEditSection = (section: DocumentSection) => {
    setEditingSection(section);
    setSectionTitle(section.title);
    setSectionContent(section.content);
  };

  const handleSaveSection = async () => {
    if (!viewingSections || !currentOrg || !sectionTitle.trim() || !sectionContent.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      if (editingSection) {
        // Update existing section
        const { error } = await supabase
          .from("document_sections")
          .update({
            title: sectionTitle,
            content: sectionContent,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingSection.id);

        if (error) throw error;
      } else {
        // Create new section
        const maxOrder = sections.length > 0
          ? Math.max(...sections.map(s => s.display_order))
          : -1;

        const { error } = await supabase
          .from("document_sections")
          .insert({
            document_id: viewingSections.id,
            org_id: currentOrg.id,
            title: sectionTitle,
            content: sectionContent,
            display_order: maxOrder + 1,
            questions_answers: [],
            created_by: user.id,
          });

        if (error) throw error;
      }

      // Reset form
      setEditingSection(null);
      setSectionTitle("");
      setSectionContent("");

      // Reload sections
      await loadSections(viewingSections.id);
    } catch (error) {
      console.error("Error saving section:", error);
      alert("Failed to save section. Please try again.");
    }
  };

  const handleDeleteSection = async (section: DocumentSection) => {
    if (!confirm(`Delete section "${section.title}"?`)) return;

    try {
      const { error } = await supabase
        .from("document_sections")
        .delete()
        .eq("id", section.id);

      if (error) throw error;

      await loadSections(section.document_id);
    } catch (error) {
      console.error("Error deleting section:", error);
      alert("Failed to delete section. Please try again.");
    }
  };

  const handleMoveSection = async (section: DocumentSection, direction: "up" | "down") => {
    const currentIndex = sections.findIndex(s => s.id === section.id);
    if (currentIndex === -1) return;
    if (direction === "up" && currentIndex === 0) return;
    if (direction === "down" && currentIndex === sections.length - 1) return;

    const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const swapSection = sections[swapIndex];

    try {
      // Swap display_order values
      await supabase
        .from("document_sections")
        .update({ display_order: swapSection.display_order })
        .eq("id", section.id);

      await supabase
        .from("document_sections")
        .update({ display_order: section.display_order })
        .eq("id", swapSection.id);

      await loadSections(section.document_id);
    } catch (error) {
      console.error("Error reordering sections:", error);
      alert("Failed to reorder sections. Please try again.");
    }
  };

  // ===== Q&A FUNCTIONS =====
  const handleAddQuestion = async () => {
    if (!qaSection || !newQuestion.trim()) return;

    try {
      const updatedQAs = [
        ...(qaSection.questions_answers || []),
        {
          question: newQuestion,
          answer: "",
          answered_by: null,
          answered_at: null,
        }
      ];

      const { error } = await supabase
        .from("document_sections")
        .update({
          questions_answers: updatedQAs,
          updated_at: new Date().toISOString(),
        })
        .eq("id", qaSection.id);

      if (error) throw error;

      setNewQuestion("");
      await loadSections(qaSection.document_id);

      // Update qaSection state with latest data
      const updated = sections.find(s => s.id === qaSection.id);
      if (updated) setQaSection(updated);
    } catch (error) {
      console.error("Error adding question:", error);
      alert("Failed to add question. Please try again.");
    }
  };

  const handleAnswerQuestion = async () => {
    if (!answeringQA || !qaAnswer.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const section = sections.find(s => s.id === answeringQA.sectionId);
      if (!section) return;

      const updatedQAs = [...(section.questions_answers || [])];
      updatedQAs[answeringQA.qaIndex] = {
        ...updatedQAs[answeringQA.qaIndex],
        answer: qaAnswer,
        answered_by: user.id,
        answered_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("document_sections")
        .update({
          questions_answers: updatedQAs,
          updated_at: new Date().toISOString(),
        })
        .eq("id", section.id);

      if (error) throw error;

      setAnsweringQA(null);
      setQaAnswer("");
      await loadSections(section.document_id);

      // Update qaSection state with latest data
      if (qaSection?.id === section.id) {
        const updated = sections.find(s => s.id === section.id);
        if (updated) setQaSection(updated);
      }
    } catch (error) {
      console.error("Error answering question:", error);
      alert("Failed to save answer. Please try again.");
    }
  };

  const handleDeleteQuestion = async (section: DocumentSection, qaIndex: number) => {
    if (!confirm("Delete this question?")) return;

    try {
      const updatedQAs = (section.questions_answers || []).filter((_, i) => i !== qaIndex);

      const { error } = await supabase
        .from("document_sections")
        .update({
          questions_answers: updatedQAs,
          updated_at: new Date().toISOString(),
        })
        .eq("id", section.id);

      if (error) throw error;

      await loadSections(section.document_id);

      // Update qaSection state with latest data
      if (qaSection?.id === section.id) {
        const updated = sections.find(s => s.id === section.id);
        if (updated) setQaSection(updated);
      }
    } catch (error) {
      console.error("Error deleting question:", error);
      alert("Failed to delete question. Please try again.");
    }
  };

  return (
    <div className="container-xl space-y-5 pb-20 animate-fade-in">
      {/* Page Header */}
      <header className="flex items-start justify-between pb-3 border-b border-gray-200">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Documents</h1>
          <p className="text-sm text-muted-foreground">Manage project documents and files</p>
          <RoleBadge />
        </div>
        <PermissionGuard require="create">
          <Button
            onClick={() => setIsUploading(true)}
            size="icon"
            className="bg-primary hover:bg-primary/90 text-white rounded-lg h-9 w-9 shadow-sm hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="Upload new document"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </PermissionGuard>
      </header>

      {/* Upload Document Dialog */}
      <Dialog open={isUploading} onOpenChange={setIsUploading}>
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>Upload a PDF document to your project library</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 px-1">
            <div className="space-y-2">
              <Label htmlFor="file-upload">PDF File</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="file-upload"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileSelect}
                  className="bg-white focus-visible:ring-2 focus-visible:ring-primary"
                />
                <Upload className="h-5 w-5 text-muted-foreground" />
              </div>
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Document Name</Label>
              <Input
                id="name"
                placeholder="Enter document name"
                value={newDocument.name}
                onChange={(e) => setNewDocument({ ...newDocument, name: e.target.value })}
                className="bg-white focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                placeholder="Describe the document (optional)"
                value={newDocument.description}
                onChange={(e) => setNewDocument({ ...newDocument, description: e.target.value })}
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={newDocument.category}
                onChange={(e) => setNewDocument({ ...newDocument, category: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => {
              setIsUploading(false);
              setSelectedFile(null);
              setNewDocument({ name: "", description: "", category: "general" });
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleUploadDocument}
              disabled={!selectedFile || !newDocument.name.trim()}
            >
              Upload Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document List */}
      <div className="grid gap-4">
        {isLoading ? (
          <Card className="p-16 flex flex-col items-center justify-center text-center">
            <p className="text-lg font-medium text-muted-foreground">Loading documents...</p>
          </Card>
        ) : documents.length === 0 ? (
          <Card className="p-16 flex flex-col items-center justify-center text-center">
            <FileStack className="h-12 w-12 text-muted-foreground/50 mb-4" aria-hidden="true" />
            <p className="text-lg font-medium text-muted-foreground mb-2">No documents yet</p>
            <p className="text-sm text-muted-foreground max-w-md">
              Upload documents using the button above or ask the AI assistant to help you get started
            </p>
          </Card>
        ) : (
          documents.map((doc) => (
            <Card key={doc.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <FileStack className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <h3 className="text-lg font-semibold text-foreground tracking-tight truncate">
                      {doc.name}
                    </h3>
                    <Badge variant="outline" className={getCategoryColor(doc.category)}>
                      {CATEGORIES.find(c => c.value === doc.category)?.label || doc.category}
                    </Badge>
                  </div>
                  {doc.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                      {doc.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{formatFileSize(doc.file_size)}</span>
                    <span>•</span>
                    <span>{formatDate(doc.created_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => handleViewSections(doc)}
                    aria-label="View sections"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => handleDownloadDocument(doc)}
                    aria-label="Download document"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <PermissionGuard require="delete">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive/80"
                      onClick={() => setDeletingDocument(doc)}
                      aria-label="Delete document"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </PermissionGuard>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingDocument} onOpenChange={(open) => !open && setDeletingDocument(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deletingDocument?.name}&quot;? This action cannot be undone and the file will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingDocument(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteDocument}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sections Dialog */}
      <Dialog open={!!viewingSections} onOpenChange={(open) => {
        if (!open) {
          setViewingSections(null);
          setSections([]);
          setEditingSection(null);
          setSectionTitle("");
          setSectionContent("");
        }
      }}>
        <DialogContent className="max-h-[90vh] flex flex-col max-w-4xl">
          <DialogHeader>
            <DialogTitle>Sections: {viewingSections?.name}</DialogTitle>
            <DialogDescription>
              Break down the document into sections and add Q&A for each section
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto flex-1 px-1">
            {/* Section Editor */}
            {canEdit && (
              <Card className="p-4 bg-slate-50 border-2 border-dashed">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="section-title">Section Title</Label>
                    <Input
                      id="section-title"
                      placeholder="Enter section title"
                      value={sectionTitle}
                      onChange={(e) => setSectionTitle(e.target.value)}
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="section-content">Section Content</Label>
                    <textarea
                      id="section-content"
                      placeholder="Enter section content"
                      value={sectionContent}
                      onChange={(e) => setSectionContent(e.target.value)}
                      rows={4}
                      className="flex w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveSection}
                      disabled={!sectionTitle.trim() || !sectionContent.trim()}
                      size="sm"
                    >
                      {editingSection ? "Update Section" : "Add Section"}
                    </Button>
                    {editingSection && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingSection(null);
                          setSectionTitle("");
                          setSectionContent("");
                        }}
                        size="sm"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* Sections List */}
            {sections.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <List className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No sections yet. Add your first section above.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sections.map((section, index) => (
                  <Card key={section.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="bg-slate-100">
                              Section {index + 1}
                            </Badge>
                            <h4 className="font-semibold text-base">{section.title}</h4>
                          </div>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {section.content}
                          </p>
                          {section.questions_answers && section.questions_answers.length > 0 && (
                            <div className="mt-2">
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                <MessageSquare className="h-3 w-3 mr-1" />
                                {section.questions_answers.length} Q&A
                              </Badge>
                            </div>
                          )}
                        </div>

                        {canEdit && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => handleMoveSection(section, "up")}
                              disabled={index === 0}
                              aria-label="Move up"
                            >
                              <ArrowUp className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => handleMoveSection(section, "down")}
                              disabled={index === sections.length - 1}
                              aria-label="Move down"
                            >
                              <ArrowDown className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => setQaSection(section)}
                              aria-label="Manage Q&A"
                            >
                              <MessageSquare className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => handleEditSection(section)}
                              aria-label="Edit section"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleDeleteSection(section)}
                              aria-label="Delete section"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setViewingSections(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Q&A Dialog */}
      <Dialog open={!!qaSection} onOpenChange={(open) => {
        if (!open) {
          setQaSection(null);
          setNewQuestion("");
          setAnsweringQA(null);
          setQaAnswer("");
        }
      }}>
        <DialogContent className="max-h-[90vh] flex flex-col max-w-3xl">
          <DialogHeader>
            <DialogTitle>Q&A: {qaSection?.title}</DialogTitle>
            <DialogDescription>
              Ask questions and provide answers about this section
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto flex-1 px-1">
            {/* Add Question */}
            {canEdit && (
              <Card className="p-4 bg-slate-50 border-2 border-dashed">
                <div className="space-y-3">
                  <Label htmlFor="new-question">Add Question</Label>
                  <div className="flex gap-2">
                    <Input
                      id="new-question"
                      placeholder="Enter your question"
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      className="bg-white"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newQuestion.trim()) {
                          handleAddQuestion();
                        }
                      }}
                    />
                    <Button
                      onClick={handleAddQuestion}
                      disabled={!newQuestion.trim()}
                      size="sm"
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Q&A List */}
            {!qaSection?.questions_answers || qaSection.questions_answers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No questions yet. Add your first question above.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {qaSection.questions_answers.map((qa, index) => (
                  <Card key={index} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700">
                              Q{index + 1}
                            </Badge>
                            <p className="font-medium text-sm">{qa.question}</p>
                          </div>
                          {qa.answer ? (
                            <div className="bg-green-50 border border-green-200 rounded-md p-3">
                              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 mb-2">
                                Answer
                              </Badge>
                              <p className="text-sm whitespace-pre-wrap">{qa.answer}</p>
                              {qa.answered_at && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  Answered {formatDate(qa.answered_at)}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
                              <p className="text-sm text-muted-foreground italic">No answer yet</p>
                              {canEdit && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="mt-2"
                                  onClick={() => {
                                    setAnsweringQA({ sectionId: qaSection.id, qaIndex: index });
                                    setQaAnswer("");
                                  }}
                                >
                                  Answer
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                        {canEdit && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive flex-shrink-0"
                            onClick={() => handleDeleteQuestion(qaSection, index)}
                            aria-label="Delete question"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setQaSection(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Answer Question Dialog */}
      <Dialog open={!!answeringQA} onOpenChange={(open) => {
        if (!open) {
          setAnsweringQA(null);
          setQaAnswer("");
        }
      }}>
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Answer Question</DialogTitle>
            <DialogDescription>
              Provide your answer to the question
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto flex-1 px-1">
            {answeringQA && qaSection && (
              <>
                <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
                  <Label className="text-xs text-muted-foreground">Question</Label>
                  <p className="font-medium text-sm mt-1">
                    {qaSection.questions_answers[answeringQA.qaIndex]?.question}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qa-answer">Your Answer</Label>
                  <textarea
                    id="qa-answer"
                    placeholder="Type your answer here..."
                    value={qaAnswer}
                    onChange={(e) => setQaAnswer(e.target.value)}
                    rows={6}
                    className="flex w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                    autoFocus
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setAnsweringQA(null);
              setQaAnswer("");
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleAnswerQuestion}
              disabled={!qaAnswer.trim()}
            >
              Save Answer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
