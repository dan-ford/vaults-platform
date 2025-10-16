import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // For now, return placeholder text until PDF extraction is fixed
    // TODO: Fix pdfjs-dist server-side import issue
    console.warn('PDF text extraction temporarily disabled - using placeholder');

    return NextResponse.json({
      text: `[PDF Document: ${file.name}]\n\nText extraction temporarily unavailable. Please use the FastAPI RAG ingestion endpoint to process this document after upload.`,
      warning: 'PDF text extraction currently disabled - document uploaded successfully but text not extracted'
    });

    /* Temporarily disabled due to pdfjs-dist import issue
    const bytes = await file.arrayBuffer();
    const uint8Array = new Uint8Array(bytes);

    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

    const loadingTask = pdfjsLib.getDocument({
      data: uint8Array,
      useSystemFonts: true,
    });

    const pdf = await loadingTask.promise;
    const textParts: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      textParts.push(pageText);
    }

    const fullText = textParts.join('\n\n');

    return NextResponse.json({ text: fullText });
    */
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    return NextResponse.json(
      { error: 'Failed to extract text from PDF' },
      { status: 500 }
    );
  }
}
