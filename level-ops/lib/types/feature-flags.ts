/**
 * Feature flags for the VAULTS platform
 *
 * These flags control the availability of new features and modules
 * at the organization level. All flags default to false for backward
 * compatibility.
 */

export interface FeatureFlags {
  /** Module feature flags */
  modules: {
    /** Executive Layer V2 - New executive-focused modules */
    executive_layer_v2: boolean;

    /** Metrics module - KPI tracking with trends */
    metrics: boolean;

    /** Finance module - Financial snapshots and runway tracking */
    finance: boolean;

    /** Board Packs module - Immutable board materials with watermarking */
    packs: boolean;

    /** Portfolio dashboard - Cross-vault analytics for investors */
    portfolio: boolean;

    /** Document sections - Hierarchical document structure with Q&A */
    document_sections: boolean;

    /** Decision approvals - Multi-signature approval workflow */
    decision_approvals: boolean;
  };

  /** Experimental features (opt-in beta) */
  experiments?: {
    /** AI-powered auto-draft for executive summaries */
    ai_auto_draft: boolean;

    /** Batch pack generation across multiple vaults */
    batch_pack_generation: boolean;

    /** Portfolio-level alerts and notifications */
    portfolio_alerts: boolean;
  };
}

/**
 * Default feature flags for new organizations
 */
export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  modules: {
    executive_layer_v2: false,
    metrics: false,
    finance: false,
    packs: false,
    portfolio: false,
    document_sections: false,
    decision_approvals: false,
  },
  experiments: {
    ai_auto_draft: false,
    batch_pack_generation: false,
    portfolio_alerts: false,
  },
};

/**
 * Feature flag metadata for UI display
 */
export const FEATURE_FLAG_METADATA: Record<
  string,
  {
    label: string;
    description: string;
    category: "module" | "experiment";
    dependencies?: string[];
  }
> = {
  executive_layer_v2: {
    label: "Executive Layer V2",
    description:
      "New executive-focused modules (Plan, Metrics, Finance, Summary, Packs, Requests)",
    category: "module",
  },
  metrics: {
    label: "Metrics Module",
    description: "Track core KPIs with trends, targets, and variance notes",
    category: "module",
    dependencies: ["executive_layer_v2"],
  },
  finance: {
    label: "Finance Module",
    description:
      "Monthly financial snapshots with ARR, cash, burn, and runway tracking",
    category: "module",
    dependencies: ["executive_layer_v2"],
  },
  packs: {
    label: "Board Packs",
    description:
      "Generate immutable, watermarked board packs with SHA-256 hashing",
    category: "module",
    dependencies: ["executive_layer_v2"],
  },
  portfolio: {
    label: "Portfolio Dashboard",
    description: "Cross-vault analytics, trends, and deltas for investors",
    category: "module",
    dependencies: ["executive_layer_v2"],
  },
  document_sections: {
    label: "Document Sections",
    description: "Hierarchical document structure with inline Q&A threads",
    category: "module",
    dependencies: ["executive_layer_v2"],
  },
  decision_approvals: {
    label: "Decision Approvals",
    description: "Multi-signature approval workflow for decisions",
    category: "module",
    dependencies: ["executive_layer_v2"],
  },
  ai_auto_draft: {
    label: "AI Auto-Draft",
    description: "Automatically generate executive summary drafts using AI",
    category: "experiment",
    dependencies: ["executive_layer_v2"],
  },
  batch_pack_generation: {
    label: "Batch Pack Generation",
    description: "Generate combined board packs across multiple vaults",
    category: "experiment",
    dependencies: ["portfolio", "packs"],
  },
  portfolio_alerts: {
    label: "Portfolio Alerts",
    description: "Real-time alerts for stale updates, KPI breaches, and risks",
    category: "experiment",
    dependencies: ["portfolio"],
  },
};
