import { createBrowserClient } from "@supabase/ssr";

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL is not set");
}

if (!supabaseAnonKey) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is not set");
}

if (supabaseUrl && supabaseAnonKey) {
  console.log("✅ Supabase client initialized with URL:", supabaseUrl);
}

export const supabase = createBrowserClient(
  supabaseUrl!,
  supabaseAnonKey!
);
