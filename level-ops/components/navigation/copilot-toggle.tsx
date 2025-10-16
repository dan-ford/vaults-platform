"use client";

import { useEffect, useState } from "react";
import { Bot } from "lucide-react";

export function CopilotToggle() {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    // Find and click the hidden CopilotKit popup button
    const popupButton = document.querySelector('[data-copilot-popup-trigger]') as HTMLButtonElement;
    if (popupButton) {
      popupButton.click();
      setIsOpen(!isOpen);
    }
  };

  // Listen for CopilotKit state changes
  useEffect(() => {
    const checkPopupState = () => {
      const popupContainer = document.querySelector('[data-copilot-popup-container]');
      setIsOpen(!!popupContainer);
    };

    const observer = new MutationObserver(checkPopupState);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return (
    <button
      onClick={handleToggle}
      className={`p-2 rounded-lg hover:bg-secondary/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${isOpen ? 'bg-primary/10' : ''}`}
      aria-label="Toggle AI Assistant"
      title="AI Assistant"
    >
      <Bot className={`h-5 w-5 ${isOpen ? 'text-primary' : 'text-foreground'}`} aria-hidden="true" />
    </button>
  );
}
