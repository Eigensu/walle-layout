import { validateFrontendEnv, type FrontendEnv } from '@fantasy11/env';

// Load and validate frontend environment variables
export const env: FrontendEnv = validateFrontendEnv({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
});

// Export individual values for convenience
export const {
  NODE_ENV,
  NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_APP_VERSION,
} = env;

// Helper functions
export const isProduction = NODE_ENV === 'production';
export const isDevelopment = NODE_ENV === 'development';
export const isTest = NODE_ENV === 'test';
