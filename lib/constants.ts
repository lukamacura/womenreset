/**
 * Application constants
 */

// Site URL for email redirects and authentication callbacks
// Can be overridden with NEXT_PUBLIC_SITE_URL environment variable
// Defaults to https://womenreset.com for production
// IMPORTANT: This URL must be added to Supabase Authentication → URL Configuration → Redirect URLs
// The redirect URL format should be: ${SITE_URL}${AUTH_CALLBACK_PATH}
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://womenreset.com";

// Auth callback path
export const AUTH_CALLBACK_PATH = "/auth/callback";

