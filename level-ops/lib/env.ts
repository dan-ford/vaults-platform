/**
 * Environment Variable Validation
 *
 * This module validates required environment variables at runtime
 * and provides typed access to configuration values.
 */

interface EnvConfig {
  // Supabase (REQUIRED)
  supabase: {
    url: string;
    anonKey: string;
    serviceKey: string;
  };

  // Application (REQUIRED)
  app: {
    name: string;
    url: string;
  };

  // CopilotKit (REQUIRED for AI features)
  copilot: {
    apiKey: string | undefined;
  };

  // Optional Features
  features: {
    rag: {
      enabled: boolean;
      apiUrl?: string;
      openaiKey?: string;
    };
    stripe: {
      enabled: boolean;
      secretKey?: string;
      publishableKey?: string;
      webhookSecret?: string;
      prices?: {
        small?: string;
        medium?: string;
        enterprise?: string;
      };
    };
    email: {
      enabled: boolean;
      provider?: 'resend' | 'postmark';
      apiKey?: string;
      fromName?: string;
      fromAddress?: string;
    };
    maps: {
      enabled: boolean;
      apiKey?: string;
    };
  };

  // Development flags
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
}

/**
 * Require an environment variable or throw a descriptive error
 */
function requireEnv(key: string, context?: string): string {
  const value = process.env[key];

  if (!value || value.trim() === '') {
    const message = context
      ? `Missing required environment variable: ${key} (${context})`
      : `Missing required environment variable: ${key}`;

    throw new Error(message);
  }

  return value;
}

/**
 * Get optional environment variable with default
 */
function getEnv(key: string, defaultValue?: string): string | undefined {
  const value = process.env[key];
  return value || defaultValue;
}

/**
 * Validate and parse environment variables
 */
function validateEnv(): EnvConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';

  // Core infrastructure (REQUIRED)
  const supabaseUrl = requireEnv(
    'NEXT_PUBLIC_SUPABASE_URL',
    'Supabase project URL'
  );

  const supabaseAnonKey = requireEnv(
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'Supabase anonymous/public key'
  );

  // Service key only required on server-side
  const supabaseServiceKey = typeof window === 'undefined'
    ? requireEnv('SUPABASE_SERVICE_KEY', 'Supabase service role key (server-only)')
    : '';

  const appName = getEnv('NEXT_PUBLIC_APP_NAME', 'VAULTS') || 'VAULTS';
  const appUrl = getEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000') || 'http://localhost:3000';

  // CopilotKit (warn if missing in development, but don't block)
  const copilotApiKey = getEnv('NEXT_PUBLIC_COPILOT_CLOUD_API_KEY');
  if (!copilotApiKey && nodeEnv === 'development' && typeof window !== 'undefined') {
    console.warn(
      '⚠️  CopilotKit API key not configured. AI features will be disabled.\n' +
      '   Set NEXT_PUBLIC_COPILOT_CLOUD_API_KEY in your .env.local file.'
    );
  }

  // RAG Search (optional)
  const fastapiUrl = getEnv('FASTAPI_URL');
  const openaiKey = getEnv('OPENAI_API_KEY');
  const ragEnabled = !!(fastapiUrl && openaiKey);

  if (fastapiUrl && !openaiKey && nodeEnv === 'development') {
    console.warn(
      '⚠️  FASTAPI_URL is set but OPENAI_API_KEY is missing.\n' +
      '   RAG search will not work without OpenAI embeddings.'
    );
  }

  // Stripe (optional)
  const stripeSecretKey = getEnv('STRIPE_SECRET_KEY');
  const stripePublishableKey = getEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
  const stripeWebhookSecret = getEnv('STRIPE_WEBHOOK_SECRET');
  const stripeEnabled = !!(stripeSecretKey && stripePublishableKey);

  if (stripeEnabled && !stripeWebhookSecret && nodeEnv === 'production') {
    console.warn(
      '⚠️  Stripe is configured but STRIPE_WEBHOOK_SECRET is missing.\n' +
      '   Webhook events will not be verified. This is a security risk.'
    );
  }

  // Email (optional)
  const resendKey = getEnv('RESEND_API_KEY');
  const postmarkToken = getEnv('POSTMARK_SERVER_TOKEN');
  const emailProvider = resendKey ? 'resend' : postmarkToken ? 'postmark' : undefined;
  const emailEnabled = !!(resendKey || postmarkToken);

  // Google Maps (optional)
  const mapsApiKey = getEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY');
  const mapsEnabled = !!mapsApiKey;

  return {
    supabase: {
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
      serviceKey: supabaseServiceKey,
    },
    app: {
      name: appName,
      url: appUrl,
    },
    copilot: {
      apiKey: copilotApiKey,
    },
    features: {
      rag: {
        enabled: ragEnabled,
        apiUrl: fastapiUrl,
        openaiKey: openaiKey,
      },
      stripe: {
        enabled: stripeEnabled,
        secretKey: stripeSecretKey,
        publishableKey: stripePublishableKey,
        webhookSecret: stripeWebhookSecret,
        prices: {
          small: getEnv('STRIPE_PRICE_ID_SMALL'),
          medium: getEnv('STRIPE_PRICE_ID_MEDIUM'),
          enterprise: getEnv('STRIPE_PRICE_ID_ENTERPRISE'),
        },
      },
      email: {
        enabled: emailEnabled,
        provider: emailProvider,
        apiKey: resendKey || postmarkToken,
        fromName: getEnv('EMAIL_FROM_NAME', 'VAULTS'),
        fromAddress: getEnv('EMAIL_FROM_ADDRESS', 'noreply@vaults.email'),
      },
      maps: {
        enabled: mapsEnabled,
        apiKey: mapsApiKey,
      },
    },
    isDevelopment: nodeEnv === 'development',
    isProduction: nodeEnv === 'production',
    isTest: nodeEnv === 'test',
  };
}

/**
 * Validated environment configuration
 * Throws error if required variables are missing
 */
export const ENV = validateEnv();

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof ENV.features): boolean {
  return ENV.features[feature].enabled;
}

/**
 * Get feature configuration or throw if not enabled
 */
export function requireFeature<K extends keyof typeof ENV.features>(
  feature: K
): typeof ENV.features[K] {
  const config = ENV.features[feature];

  if (!config.enabled) {
    throw new Error(
      `Feature "${feature}" is not enabled. Check environment variables.`
    );
  }

  return config;
}

/**
 * Development helper: Log current configuration
 */
export function logEnvStatus(): void {
  if (typeof window !== 'undefined') {
    // Client-side
    console.log('🔧 VAULTS Configuration (Client)');
    console.log('  App:', ENV.app.name, '@', ENV.app.url);
    console.log('  Supabase:', ENV.supabase.url ? '✅' : '❌');
    console.log('  CopilotKit:', ENV.copilot.apiKey ? '✅' : '❌');
    console.log('  RAG Search:', ENV.features.rag.enabled ? '✅' : '❌');
    console.log('  Stripe:', ENV.features.stripe.enabled ? '✅' : '❌');
    console.log('  Email:', ENV.features.email.enabled ? '✅' : '❌');
    console.log('  Maps:', ENV.features.maps.enabled ? '✅' : '❌');
  } else {
    // Server-side
    console.log('🔧 VAULTS Configuration (Server)');
    console.log('  Environment:', ENV.isProduction ? 'PRODUCTION' : 'DEVELOPMENT');
    console.log('  Supabase:', ENV.supabase.url ? '✅' : '❌');
    console.log('  Service Key:', ENV.supabase.serviceKey ? '✅' : '❌');
    console.log('  RAG Search:', ENV.features.rag.enabled ? '✅' : '❌');
    console.log('  Stripe:', ENV.features.stripe.enabled ? '✅' : '❌');
    console.log('  Email:', ENV.features.email.enabled ? '✅' : '❌');
  }
}

// Log configuration in development
if (ENV.isDevelopment && typeof window !== 'undefined') {
  // Only log once on initial load
  if (!window.__vaults_env_logged) {
    logEnvStatus();
    window.__vaults_env_logged = true;
  }
}

// Type augmentation for window
declare global {
  interface Window {
    __vaults_env_logged?: boolean;
  }
}
