/**
 * Module Toggle System
 *
 * Defines available modules and their settings for white-label customization.
 * Organizations can enable/disable modules to create a tailored experience.
 */

export type ModuleKey =
  | 'tasks'
  | 'milestones'
  | 'risks'
  | 'documents'
  | 'decisions'
  | 'contacts'
  | 'reports'
  | 'secrets';

export interface ModuleDefinition {
  key: ModuleKey;
  name: string;
  description: string;
  icon: string;
  defaultEnabled: boolean;
  required: boolean; // Cannot be disabled
}

export interface ModuleSettings {
  modules?: {
    [key in ModuleKey]?: boolean;
  };
}

/**
 * Available modules in the system
 */
export const AVAILABLE_MODULES: ModuleDefinition[] = [
  {
    key: 'tasks',
    name: 'Tasks',
    description: 'Task management with status tracking and assignments',
    icon: 'CheckSquare',
    defaultEnabled: true,
    required: false,
  },
  {
    key: 'milestones',
    name: 'Milestones',
    description: 'Project milestones and deliverable tracking',
    icon: 'Flag',
    defaultEnabled: true,
    required: false,
  },
  {
    key: 'risks',
    name: 'Risks',
    description: 'Risk identification and mitigation tracking',
    icon: 'AlertTriangle',
    defaultEnabled: true,
    required: false,
  },
  {
    key: 'documents',
    name: 'Documents',
    description: 'Document management with AI-powered search',
    icon: 'FileText',
    defaultEnabled: true,
    required: false,
  },
  {
    key: 'decisions',
    name: 'Decisions',
    description: 'Architecture Decision Records (ADRs)',
    icon: 'GitBranch',
    defaultEnabled: true,
    required: false,
  },
  {
    key: 'contacts',
    name: 'Contacts',
    description: 'Contact and stakeholder management',
    icon: 'Users',
    defaultEnabled: true,
    required: false,
  },
  {
    key: 'reports',
    name: 'Reports',
    description: 'Executive summaries and analytics reports',
    icon: 'TrendingUp',
    defaultEnabled: true,
    required: false,
  },
  {
    key: 'secrets',
    name: 'Secrets',
    description: 'Secure trade secret storage with cryptographic sealing and audit trails',
    icon: 'Shield',
    defaultEnabled: false,
    required: false,
  },
];

/**
 * Check if a module is enabled for an organization
 */
export function isModuleEnabled(
  settings: ModuleSettings | null | undefined,
  moduleKey: ModuleKey
): boolean {
  // If no settings, use default
  if (!settings || !settings.modules) {
    const module = AVAILABLE_MODULES.find(m => m.key === moduleKey);
    return module?.defaultEnabled ?? true;
  }

  // Check explicit setting
  const enabled = settings.modules[moduleKey];
  if (enabled !== undefined) {
    return enabled;
  }

  // Fall back to default
  const module = AVAILABLE_MODULES.find(m => m.key === moduleKey);
  return module?.defaultEnabled ?? true;
}

/**
 * Get default module settings
 */
export function getDefaultModuleSettings(): ModuleSettings {
  return {
    modules: AVAILABLE_MODULES.reduce((acc, module) => {
      acc[module.key] = module.defaultEnabled;
      return acc;
    }, {} as { [key in ModuleKey]: boolean }),
  };
}
