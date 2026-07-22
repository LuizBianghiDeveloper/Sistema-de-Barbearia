import { createClient } from "@/lib/supabase/server"

export type Role = "client" | "barber" | "admin"

export type SessionProfile = {
  userId: string
  nome: string
  email: string | null
  role: Role
}

/** Retorna o usuário autenticado + seu perfil/papel, ou null se deslogado. */
export async function getSessionProfile(): Promise<SessionProfile | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("nome, email, role")
    .eq("id", user.id)
    .single()

  if (!profile) return null

  return {
    userId: user.id,
    nome: profile.nome,
    email: profile.email,
    role: profile.role as Role,
  }
}

/** Rota inicial de cada papel após o login. */
export function homeForRole(role: Role): string {
  switch (role) {
    case "admin":
      return "/painel"
    case "barber":
      return "/painel"
    default:
      return "/painel"
  }
}
