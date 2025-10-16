"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, FileText } from "lucide-react";
import { searchChunksHybrid } from "@/lib/supabase/rag";
import { useOrganization } from "@/lib/context/organization-context";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { RoleBadge } from "@/components/permissions";

type SearchResult = {
  id: string;
  document_id: string;
  document_name: string;
  chunk_index: number;
  page: number | null;
  content: string;
  sim: number;
  bm25: number;
  fused: number;
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentOrg } = useOrganization();
  const { hasPermission, role, canEdit, isViewer } = usePermissions();

  const handleSearch = async () => {
    if (!query.trim() || !currentOrg) {
      console.log('Search blocked: query or org missing', { query, orgId: currentOrg?.id });
      return;
    }

    console.log('Starting search...', { query, orgId: currentOrg.id });
    setIsSearching(true);
    setError(null);

    try {
      // Generate query embedding via OpenAI API
      console.log('Fetching embedding...');
      const embeddingResponse = await fetch('/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: query })
      });

      console.log('Embedding response status:', embeddingResponse.status);

      if (!embeddingResponse.ok) {
        const errorText = await embeddingResponse.text();
        console.error('Embedding API error:', errorText);
        throw new Error('Failed to generate query embedding');
      }

      const { embedding } = await embeddingResponse.json();
      console.log('Embedding generated, length:', embedding?.length);

      // Search using hybrid function
      console.log('Calling searchChunksHybrid...');
      const { data, error: searchError } = await searchChunksHybrid(
        embedding,
        query,
        currentOrg.id,
        10 // top-k results
      );

      console.log('Search result:', { data, error: searchError });

      if (searchError) {
        console.error('Search error:', searchError);
        throw searchError;
      }

      console.log('Setting results:', data?.length || 0, 'items');
      setResults(data || []);
    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="border-b p-4">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold">Document Search</h1>
          <p className="text-sm text-muted-foreground">
            Semantic search across your document knowledge base
          </p>
          <RoleBadge />
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <Input
            type="text"
            placeholder="Ask a question about your documents..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1"
          />
          <Button
            onClick={handleSearch}
            disabled={isSearching || !query.trim()}
          >
            <Search className="h-4 w-4 mr-2" />
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {error && (
            <Card className="p-4 border-destructive/20 bg-destructive/10">
              <p className="text-destructive text-sm">{error}</p>
            </Card>
          )}

          {results.length === 0 && !error && !isSearching && (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Enter a query to search your documents</p>
            </div>
          )}

          {results.map((result, idx) => (
            <Card key={result.id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{result.document_name}</span>
                </div>
                <div className="flex gap-2">
                  {result.page !== null && (
                    <Badge variant="outline" className="text-xs">
                      Page {result.page}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-xs">
                    Score: {(result.fused * 100).toFixed(1)}%
                  </Badge>
                </div>
              </div>

              <p className="text-sm text-gray-700 leading-relaxed">
                {result.content}
              </p>

              <div className="mt-3 flex gap-3 text-xs text-muted-foreground">
                <span>Vector: {(result.sim * 100).toFixed(1)}%</span>
                <span>BM25: {(result.bm25 * 100).toFixed(1)}%</span>
                <span>Chunk: {result.chunk_index}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
