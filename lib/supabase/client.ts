import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client untuk digunakan di Client Components ('use client').
 * Menggunakan cookie-based session via @supabase/ssr.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
