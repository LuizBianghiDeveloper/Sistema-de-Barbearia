import { createClient } from "@/lib/supabase/server"
import { type SessionProfile } from "@/lib/auth"

export type ManageableBarber = {
  id: string
  nome: string
  ativo: boolean
}

/**
 * Barbeiros que o usuário atual pode gerenciar (jornada/folgas):
 * admin vê todos; barbeiro vê apenas a si mesmo.
 */
export async function getManageableBarbers(
  profile: SessionProfile
): Promise<ManageableBarber[]> {
  const supabase = await createClient()

  const query = supabase
    .from("barbers")
    .select("id, ativo, profile:profiles(nome, id)")
    .order("criado_em", { ascending: true })

  const { data } = await query
  const rows = (data ?? []) as unknown as {
    id: string
    ativo: boolean
    profile: { nome: string; id: string } | null
  }[]

  const mapped = rows.map((r) => ({
    id: r.id,
    nome: r.profile?.nome ?? "Barbeiro",
    ativo: r.ativo,
    profileId: r.profile?.id,
  }))

  if (profile.role === "admin") {
    return mapped.map(({ id, nome, ativo }) => ({ id, nome, ativo }))
  }

  // Barbeiro: apenas o próprio registro.
  return mapped
    .filter((b) => b.profileId === profile.userId)
    .map(({ id, nome, ativo }) => ({ id, nome, ativo }))
}
