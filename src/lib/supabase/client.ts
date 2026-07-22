import { createBrowserClient } from "@supabase/ssr"

/**
 * Cliente Supabase para uso em Client Components ("use client").
 * As chaves anon são públicas por design; a segurança real vem da RLS (ENB-02).
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
