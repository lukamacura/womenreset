/**
 * Application constants
 */

// Site URL for email redirects and authentication callbacks
// Can be overridden with NEXT_PUBLIC_SITE_URL environment variable
// Defaults to http://localhost:3000 in development, https://womenreset.com for production
// IMPORTANT: This URL must be added to Supabase Authentication → URL Configuration → Redirect URLs
// The redirect URL format should be: ${SITE_URL}${AUTH_CALLBACK_PATH}
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 
  (process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://womenreset.com");

// Auth callback path
export const AUTH_CALLBACK_PATH = "/auth/callback";

/**
 * Gets the base URL for redirects based on the current environment.
 * In the browser, uses the current origin (e.g., http://localhost:3000 in dev).
 * On the server, uses SITE_URL from environment variables or defaults appropriately.
 */
export function getRedirectBaseUrl(): string {
  // Client-side: use the current origin (works for both localhost and production)
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  // Server-side: use SITE_URL (which now defaults to localhost:3000 in development)
  return SITE_URL;
}

