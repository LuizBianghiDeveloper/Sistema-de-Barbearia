import { type NextRequest, NextResponse } from "next/server"
import { type EmailOtpType } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"

/**
 * Alvo dos links de e-mail do Supabase (recuperação de senha, confirmação).
 * Verifica o token/código, estabelece a sessão e redireciona para `next`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const next = searchParams.get("next") ?? "/painel"

  const supabase = await createClient()

  // Fluxo PKCE (?code=...)
  const code = searchParams.get("code")
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
  }

  // Fluxo token_hash (?token_hash=...&type=recovery)
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) return NextResponse.redirect(`${origin}${next}`)
  }

  return NextResponse.redirect(
    `${origin}/login?erro=${encodeURIComponent("Link inválido ou expirado.")}`
  )
}
