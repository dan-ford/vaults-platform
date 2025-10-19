"use client";

import Image from "next/image";
import Link from "next/link";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { MobileBottomNav } from "@/components/navigation/mobile-bottom-nav";
import { MobileMenuSheet } from "@/components/navigation/mobile-menu-sheet";
import { MobileSystemMenu } from "@/components/navigation/mobile-system-menu";
import { UserMenu } from "@/components/navigation/user-menu";
import { OrganizationSwitcher } from "@/components/organization-switcher";
import { ErrorBoundary } from "@/components/error-boundary";
import { CopilotChat } from "@copilotkit/react-ui";
import { Bot, Search, X, LayoutDashboard, Menu } from "lucide-react";
import { useState, useEffect } from "react";
import { useRagSearchAction } from "@/lib/hooks/use-rag-search-action";
import { useReportActions } from "@/lib/hooks/use-report-actions";
import { useOrganization } from "@/lib/context/organization-context";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMobileSystemMenu, setShowMobileSystemMenu] = useState(false);
  const { currentOrg } = useOrganization();

  // Register CopilotKit actions
  useRagSearchAction();
  useReportActions();

  // Apply organization brand color as CSS variable
  useEffect(() => {
    const hexToRgb = (hex: string): string => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!result) return '38 172 226'; // Default accent color
      return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`;
    };

    if (currentOrg?.brand_color) {
      const rgb = hexToRgb(currentOrg.brand_color);
      document.documentElement.style.setProperty('--primary', rgb);
      document.documentElement.style.setProperty('--accent', rgb);
      document.documentElement.style.setProperty('--ring', rgb);
    } else {
      // Default accent color #26ace2
      document.documentElement.style.setProperty('--primary', '38 172 226');
      document.documentElement.style.setProperty('--accent', '38 172 226');
      document.documentElement.style.setProperty('--ring', '38 172 226');
    }
  }, [currentOrg?.brand_color]);

  return (
    <div className="flex min-h-screen bg-white">
      {/* Main content wrapper - entire page shifts when sidebar opens */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out md:ml-14 ${
          sidebarOpen ? 'mr-96' : 'mr-0'
        }`}
      >
        <header className="bg-white border-b border-gray-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-2.5 flex items-center justify-between">
            {/* Logo (left aligned) */}
            <Link href="/dashboard" className="inline-block">
              {currentOrg?.logo_url ? (
                <img
                  src={currentOrg.logo_url}
                  alt={currentOrg.name}
                  className="h-[40px] w-auto object-contain"
                />
              ) : (
                <Image
                  src="/logo.png"
                  alt="Logo"
                  width={60}
                  height={40}
                  priority
                  style={{ height: '40px', width: 'auto' }}
                />
              )}
            </Link>

            <div className="flex items-center gap-1">
              {/* Desktop: Show all controls */}
              <div className="hidden md:flex items-center gap-1">
                <Link
                  href="/dashboard"
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-label="Portfolio Dashboard"
                  title="Portfolio Dashboard"
                >
                  <LayoutDashboard className="h-[18px] w-[18px]" aria-hidden="true" />
                </Link>
                <OrganizationSwitcher />
                <Link
                  href="/search"
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-label="Search Documents"
                  title="Search Documents"
                >
                  <Search className="h-[18px] w-[18px]" aria-hidden="true" />
                </Link>
              </div>

              {/* Mobile: AI + Hamburger */}
              <div className="flex md:hidden items-center gap-1">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className={`h-9 w-9 inline-flex items-center justify-center rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-primary ${
                    sidebarOpen
                      ? "bg-primary text-white"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                  aria-label="Toggle AI Assistant"
                  title="AI Assistant"
                >
                  <Bot className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  onClick={() => setShowMobileSystemMenu(true)}
                  className="h-9 w-9 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-label="Open menu"
                >
                  <Menu className="h-4 w-4" />
                </button>
              </div>

              {/* Desktop: AI + User menu */}
              <div className="hidden md:flex items-center gap-1">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className={`h-8 w-8 inline-flex items-center justify-center rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-primary ${
                    sidebarOpen
                      ? "bg-primary text-white"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                  aria-label="Toggle AI Assistant"
                  title="AI Assistant"
                >
                  <Bot className="h-[18px] w-[18px]" aria-hidden="true" />
                </button>
                <UserMenu />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 mx-auto max-w-7xl px-4 sm:px-6 py-6 pb-20 md:pb-6 w-full">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>

        {/* Desktop: existing bottom nav */}
        <div className="hidden md:block">
          <BottomNav />
        </div>

        {/* Mobile: new bottom navigation (only < 768px) */}
        <div className="md:hidden">
          <MobileBottomNav onMoreClick={() => setShowMobileMenu(true)} />
        </div>
      </div>

      {/* Desktop: Fixed sidebar on the right - chat is always mounted, just hidden */}
      <div
        className={`hidden md:flex fixed top-0 right-0 bottom-0 w-96 bg-white border-l border-gray-200 transition-transform duration-300 ease-in-out z-50 flex-col ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Custom header with close button */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-semibold text-foreground">AI Assistant</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Close AI Assistant"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* CopilotChat - always rendered, persists across pages */}
        <div className="flex-1 overflow-hidden">
          <CopilotChat
            instructions={
              "You are a helpful AI assistant for VAULTS workspace management.\n\n" +
              "You have access to the following capabilities:\n" +
              "• Managing tasks, milestones, risks, decisions, and contacts\n" +
              "• Searching uploaded documents using the search_documents tool\n" +
              "• Generating executive reports (weekly and monthly summaries)\n\n" +
              "When users ask questions about uploaded documents, company information, or specific topics that might be in PDFs, " +
              "ALWAYS use the search_documents tool first before answering.\n\n" +
              "When users ask for reports, summaries, or analytics, use the generateWeeklySummary or generateMonthlySummary tools.\n\n" +
              "Example document search queries:\n" +
              "- 'What does the VDA document say about founders?'\n" +
              "- 'Tell me about the investment thesis'\n" +
              "- 'Find information about product features'\n\n" +
              "Example report queries:\n" +
              "- 'Generate a weekly summary'\n" +
              "- 'Create a monthly report'\n" +
              "- 'Show me this month\\'s executive summary'\n\n" +
              "When citing information from documents, always mention the document name and page number (if available)."
            }
            labels={{
              title: "AI Assistant",
              initial:
                "Hi! I can help you with:\n" +
                "• Managing tasks, milestones, risks, decisions, and contacts\n" +
                "• Searching and answering questions from uploaded documents\n" +
                "• Generating weekly and monthly executive summaries\n\n" +
                "What would you like to do?",
            }}
            className="h-full"
          />
        </div>
      </div>

      {/* Mobile: AI Assistant bottom sheet */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="bottom" className="h-[85vh] md:hidden p-0">
          <SheetHeader className="px-4 py-3 border-b">
            <SheetTitle>AI Assistant</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-hidden h-[calc(85vh-60px)]">
            <CopilotChat
              instructions={
                "You are a helpful AI assistant for VAULTS workspace management.\n\n" +
                "You have access to the following capabilities:\n" +
                "• Managing tasks, milestones, risks, decisions, and contacts\n" +
                "• Searching uploaded documents using the search_documents tool\n" +
                "• Generating executive reports (weekly and monthly summaries)\n\n" +
                "When users ask questions about uploaded documents, company information, or specific topics that might be in PDFs, " +
                "ALWAYS use the search_documents tool first before answering.\n\n" +
                "When users ask for reports, summaries, or analytics, use the generateWeeklySummary or generateMonthlySummary tools.\n\n" +
                "Example document search queries:\n" +
                "- 'What does the VDA document say about founders?'\n" +
                "- 'Tell me about the investment thesis'\n" +
                "- 'Find information about product features'\n\n" +
                "Example report queries:\n" +
                "- 'Generate a weekly summary'\n" +
                "- 'Create a monthly report'\n" +
                "- 'Show me this month\\'s executive summary'\n\n" +
                "When citing information from documents, always mention the document name and page number (if available)."
              }
              labels={{
                title: "AI Assistant",
                initial:
                  "Hi! I can help you with:\n" +
                  "• Managing tasks, milestones, risks, decisions, and contacts\n" +
                  "• Searching and answering questions from uploaded documents\n" +
                  "• Generating weekly and monthly executive summaries\n\n" +
                  "What would you like to do?",
              }}
              className="h-full"
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Mobile: Vault modules menu sheet */}
      <MobileMenuSheet open={showMobileMenu} onOpenChange={setShowMobileMenu} />

      {/* Mobile: System menu sheet (hamburger) */}
      <MobileSystemMenu open={showMobileSystemMenu} onOpenChange={setShowMobileSystemMenu} />
    </div>
  );
}