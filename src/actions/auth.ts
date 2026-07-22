"use server"

import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import {
  cadastroSchema,
  loginSchema,
  recuperarSenhaSchema,
  redefinirSenhaSchema,
  type CadastroInput,
  type LoginInput,
  type RecuperarSenhaInput,
  type RedefinirSenhaInput,
} from "@/lib/validations/auth"

export type ActionResult = { error: string } | { success: string }

function traduzErroAuth(mensagem: string): string {
  const m = mensagem.toLowerCase()
  if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos."
  if (m.includes("already registered")) return "Este e-mail já está em uso."
  if (m.includes("email rate limit")) return "Muitas tentativas. Tente novamente em instantes."
  if (m.includes("weak password")) return "Senha muito fraca."
  return "Não foi possível concluir. Tente novamente."
}

async function getOrigin(): Promise<string> {
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000"
  const proto = h.get("x-forwarded-proto") ?? "http"
  return `${proto}://${host}`
}

export async function signUpAction(values: CadastroInput): Promise<ActionResult> {
  const parsed = cadastroSchema.safeParse(values)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { nome, telefone, email, senha } = parsed.data

  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: { data: { nome, telefone } },
  })

  if (error) return { error: traduzErroAuth(error.message) }
  // E-mail já existente: Supabase devolve usuário sem identidades.
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return { error: "Este e-mail já está em uso." }
  }

  redirect("/painel")
}

export async function signInAction(values: LoginInput): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(values)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.senha,
  })

  if (error) return { error: traduzErroAuth(error.message) }
  redirect("/painel")
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}

export async function recuperarSenhaAction(
  values: RecuperarSenhaInput
): Promise<ActionResult> {
  const parsed = recuperarSenhaSchema.safeParse(values)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const origin = await getOrigin()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/confirm?next=/redefinir-senha`,
  })

  // Não revelamos se o e-mail existe (evita enumeração).
  if (error && !error.message.toLowerCase().includes("rate limit")) {
    return { error: traduzErroAuth(error.message) }
  }
  return {
    success:
      "Se o e-mail estiver cadastrado, enviamos um link para redefinir a senha.",
  }
}

export async function redefinirSenhaAction(
  values: RedefinirSenhaInput
): Promise<ActionResult> {
  const parsed = redefinirSenhaSchema.safeParse(values)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Link expirado. Solicite a recuperação novamente." }
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.senha })
  if (error) return { error: traduzErroAuth(error.message) }
  redirect("/painel")
}
