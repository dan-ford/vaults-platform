"use client";

import { useCopilotAction } from "@copilotkit/react-core";
import { useOrganization } from "@/lib/context/organization-context";
import { searchChunksHybrid } from "@/lib/supabase/rag";

/**
 * CopilotKit action that enables the AI assistant to search uploaded documents
 * using hybrid vector + BM25 search
 */
export function useRagSearchAction() {
  const { currentOrg } = useOrganization();

  useCopilotAction({
    name: "search_documents",
    description:
      "Search through all uploaded documents (PDFs, text files) in the knowledge base. " +
      "Use this when users ask questions about company information, documents, or specific topics that might be in uploaded files. " +
      "Returns relevant excerpts with document names and relevance scores.",
    parameters: [
      {
        name: "query",
        type: "string",
        description: "The search query or question to find relevant information about",
        required: true,
      },
      {
        name: "max_results",
        type: "number",
        description: "Maximum number of results to return (default: 5, max: 20)",
        required: false,
      },
    ],
    handler: async ({ query, max_results = 5 }) => {
      try {
        console.log("[RAG Action] Searching documents:", { query, max_results, orgId: currentOrg?.id });

        if (!currentOrg) {
          return {
            success: false,
            error: "No organization context available. Please ensure you are logged in.",
          };
        }

        // Validate max_results
        const limit = Math.min(Math.max(1, max_results || 5), 20);

        // Generate query embedding via OpenAI API
        const embeddingResponse = await fetch("/api/embeddings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: query }),
        });

        if (!embeddingResponse.ok) {
          console.error("[RAG Action] Embedding generation failed:", embeddingResponse.status);
          return {
            success: false,
            error: "Failed to generate search embedding. Please try again.",
          };
        }

        const { embedding } = await embeddingResponse.json();

        // Search using hybrid function
        const { data, error: searchError } = await searchChunksHybrid(
          embedding,
          query,
          currentOrg.id,
          limit
        );

        if (searchError) {
          console.error("[RAG Action] Search error:", searchError);
          return {
            success: false,
            error: "Search failed. Please try again.",
          };
        }

        if (!data || data.length === 0) {
          return {
            success: true,
            results_found: 0,
            message: "No relevant information found in uploaded documents.",
          };
        }

        // Format results for the agent
        const formattedResults = data.map((result, idx) => ({
          rank: idx + 1,
          document_name: result.document_name,
          chunk_index: result.chunk_index,
          page: result.page,
          content: result.content,
          relevance_score: Math.round(result.fused * 100),
          vector_score: Math.round(result.sim * 100),
          keyword_score: Math.round(result.bm25 * 100),
        }));

        // Create a readable summary for the agent
        const summary = formattedResults
          .map(
            (r) =>
              `[${r.rank}] ${r.document_name}${r.page ? ` (Page ${r.page})` : ""} - Relevance: ${r.relevance_score}%\n${r.content}\n`
          )
          .join("\n");

        console.log(`[RAG Action] Found ${data.length} results`);

        return {
          success: true,
          results_found: data.length,
          query: query,
          summary: summary,
          results: formattedResults,
          instruction_to_agent:
            "Use the information from the search results above to answer the user's question. " +
            "Always cite the document name and page number (if available) when referencing information. " +
            "If multiple results mention similar information, synthesize them into a coherent answer.",
        };
      } catch (error) {
        console.error("[RAG Action] Unexpected error:", error);
        return {
          success: false,
          error: "An unexpected error occurred during search.",
        };
      }
    },
  });
}
