"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { OrganizationProvider } from "@/lib/context/organization-context";
import { CopilotKit } from "@copilotkit/react-core";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  // Use cloud API key (the FastAPI server on port 8080 is for RAG only, not CopilotKit runtime)
  const copilotApiKey = process.env.NEXT_PUBLIC_COPILOT_CLOUD_API_KEY;

  return (
    <QueryClientProvider client={queryClient}>
      <OrganizationProvider>
        <CopilotKit
          publicApiKey={copilotApiKey}
          showDevConsole={process.env.NODE_ENV === "development"}
        >
          {children}
        </CopilotKit>
      </OrganizationProvider>
    </QueryClientProvider>
  );
}
