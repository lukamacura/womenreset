"use client";

/**
 * SessionRestorer - Disabled (using cookie-based authentication only)
 * This component is kept for compatibility but no longer performs hash-based restoration.
 * Authentication now relies solely on cookies set by the auth callback.
 */
export default function SessionRestorer() {
  // No-op - cookies handle authentication
  return null;
}

