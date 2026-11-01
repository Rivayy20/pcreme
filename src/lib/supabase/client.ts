import { createBrowserClient } from "@supabase/ssr";

/** Client Supabase untuk Client Components (browser). Hanya memakai anon key. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
