# Documents Feature Setup

This document contains the SQL migrations and Supabase Storage configuration needed for the Documents feature.

## 1. Create Documents Table

Run this SQL in the Supabase SQL Editor:

```sql
-- Create documents table
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'general',
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL DEFAULT 'application/pdf',
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON public.documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON public.documents(created_by);
CREATE INDEX IF NOT EXISTS idx_documents_category ON public.documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at DESC);

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view documents in their tenants
CREATE POLICY "Users can view documents in their tenants"
    ON public.documents
    FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id
            FROM public.tenant_members
            WHERE user_id = auth.uid()
        )
    );

-- RLS Policy: Members can manage documents
CREATE POLICY "Members can manage documents"
    ON public.documents
    FOR ALL
    USING (
        tenant_id IN (
            SELECT tenant_id
            FROM public.tenant_members
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'member')
        )
    );

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.documents;
```

## 2. Create Storage Bucket

In Supabase Dashboard:
1. Go to **Storage** → **Create a new bucket**
2. Name: `documents`
3. **Public bucket**: NO (keep it private)
4. **File size limit**: 10MB
5. **Allowed MIME types**: `application/pdf`

## 3. Set Storage Policies

Run this SQL to set up storage RLS policies:

```sql
-- Policy: Users can upload documents to their tenant folders
CREATE POLICY "Users can upload documents to their tenant folders"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = 'tenants' AND
  (storage.foldername(name))[2] IN (
    SELECT tenant_id::text
    FROM public.tenant_members
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'member')
  )
);

-- Policy: Users can read documents from their tenant folders
CREATE POLICY "Users can read documents from their tenant folders"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = 'tenants' AND
  (storage.foldername(name))[2] IN (
    SELECT tenant_id::text
    FROM public.tenant_members
    WHERE user_id = auth.uid()
  )
);

-- Policy: Users can delete documents from their tenant folders
CREATE POLICY "Users can delete documents from their tenant folders"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = 'tenants' AND
  (storage.foldername(name))[2] IN (
    SELECT tenant_id::text
    FROM public.tenant_members
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'member')
  )
);
```

## 4. Update TypeScript Types

After running the migrations, regenerate the TypeScript types:

```bash
npx supabase gen types typescript --project-id vmnwrexbgzbqpbvkgxlh > lib/supabase/database.types.ts
```

## 5. Verify Setup

Test the setup:
1. Navigate to `/documents` in the app
2. Try uploading a PDF file
3. Verify it appears in the list
4. Try downloading the file
5. Try deleting the file
6. Ask the AI assistant about documents

## Features Implemented

### UI Features:
- ✅ Upload PDF documents (max 10MB)
- ✅ Categorize documents (general, contract, proposal, report, specification, other)
- ✅ Add descriptions to documents
- ✅ Download documents
- ✅ Delete documents
- ✅ View document metadata (size, date, category)
- ✅ Auto-refresh on page visibility change
- ✅ Realtime updates when documents are added/removed
- ✅ Responsive dialogs with scrollable content

### AI Integration:
- ✅ `useCopilotReadable` - Share document metadata with AI
- ✅ `searchDocuments` action - AI can search documents by name, description, or category
- ✅ `listDocumentsByCategory` action - AI can list documents by category

### Security:
- ✅ Row Level Security (RLS) on documents table
- ✅ Storage policies enforce tenant isolation
- ✅ Files stored with tenant-specific paths: `tenants/{tenantId}/...`
- ✅ Only authenticated users with proper tenant membership can access files

## Future Enhancements (Optional):

1. **Document Parsing**: Extract text from PDFs for full-text search
2. **RAG Integration**: Feed document content to AI for question answering
3. **Versioning**: Track document versions
4. **Sharing**: Share documents with external parties via signed URLs
5. **OCR**: Extract text from scanned documents
6. **Thumbnails**: Generate PDF thumbnails for preview
7. **Bulk Operations**: Upload/download multiple documents at once
8. **Search**: Full-text search across document content
