import { createClient } from "@supabase/supabase-js"

/**
 * Cliente Supabase com a chave service_role — IGNORA a RLS.
 * Uso EXCLUSIVO no servidor (cron/jobs), nunca exposto ao cliente.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
