"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getSessionProfile } from "@/lib/auth"
import { folgaSchema, type FolgaInput } from "@/lib/validations/config"
import { localToUtc, formatLocal } from "@/lib/time"

export type ConflitoAgendamento = {
  quando: string
  cliente: string
}

export type FolgaResult =
  | { error: string }
  | { success: string }
  | { conflicts: ConflitoAgendamento[] }

async function podeGerenciar(barberId: string): Promise<boolean> {
  const profile = await getSessionProfile()
  if (!profile) return false
  if (profile.role === "admin") return true

  const supabase = await createClient()
  const { data } = await supabase
    .from("barbers")
    .select("id")
    .eq("id", barberId)
    .eq("profile_id", profile.userId)
    .maybeSingle()
  return !!data
}

export async function addFolgaAction(
  values: FolgaInput,
  confirmar = false
): Promise<FolgaResult> {
  const parsed = folgaSchema.safeParse(values)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { barber_id, data, hora_inicio, hora_fim, motivo } = parsed.data
  if (!(await podeGerenciar(barber_id))) return { error: "Acesso negado." }

  const inicio = localToUtc(data, hora_inicio)
  const fim = localToUtc(data, hora_fim)
  const supabase = await createClient()

  // RN13: avisa (não cancela) se o bloqueio cobre agendamentos ativos.
  if (!confirmar) {
    const { data: conflitantes } = await supabase
      .from("appointments")
      .select("inicio, fim, cliente_nome, client:profiles(nome)")
      .eq("barber_id", barber_id)
      .neq("status", "cancelado")
      .lt("inicio", fim.toISOString())
      .gt("fim", inicio.toISOString())
      .order("inicio")

    const rows = (conflitantes ?? []) as unknown as {
      inicio: string
      cliente_nome: string | null
      client: { nome: string } | null
    }[]

    if (rows.length > 0) {
      return {
        conflicts: rows.map((r) => ({
          quando: formatLocal(r.inicio, "dd/MM 'às' HH:mm"),
          cliente: r.client?.nome ?? r.cliente_nome ?? "Cliente",
        })),
      }
    }
  }

  const { error } = await supabase.from("time_off").insert({
    barber_id,
    inicio: inicio.toISOString(),
    fim: fim.toISOString(),
    motivo: motivo || null,
  })
  if (error) return { error: "Não foi possível criar o bloqueio." }

  revalidatePath("/folgas")
  return { success: "Bloqueio criado." }
}

export async function removeFolgaAction(id: string): Promise<FolgaResult> {
  const supabase = await createClient()

  const { data: folga } = await supabase
    .from("time_off")
    .select("barber_id")
    .eq("id", id)
    .maybeSingle()
  if (!folga) return { error: "Bloqueio não encontrado." }

  if (!(await podeGerenciar(folga.barber_id))) return { error: "Acesso negado." }

  const { error } = await supabase.from("time_off").delete().eq("id", id)
  if (error) return { error: "Não foi possível remover o bloqueio." }

  revalidatePath("/folgas")
  return { success: "Bloqueio removido." }
}
