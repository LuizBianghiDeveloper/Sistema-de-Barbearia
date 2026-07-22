"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getSessionProfile } from "@/lib/auth"
import { jornadaSchema, type JornadaInput } from "@/lib/validations/config"
import { timeToMinutes } from "@/lib/time"

export type ActionResult = { error: string } | { success: string }

/** Verifica se o usuário pode gerenciar a agenda do barbeiro informado. */
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

export async function addJornadaAction(values: JornadaInput): Promise<ActionResult> {
  const parsed = jornadaSchema.safeParse(values)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  if (!(await podeGerenciar(parsed.data.barber_id)))
    return { error: "Acesso negado." }

  const { barber_id, dia_semana, hora_inicio, hora_fim } = parsed.data
  const supabase = await createClient()

  // Impede sobreposição com intervalos já cadastrados no mesmo dia.
  const { data: existentes } = await supabase
    .from("availability")
    .select("hora_inicio, hora_fim")
    .eq("barber_id", barber_id)
    .eq("dia_semana", dia_semana)

  const novoIni = timeToMinutes(hora_inicio)
  const novoFim = timeToMinutes(hora_fim)
  const conflita = (existentes ?? []).some((e) => {
    const ini = timeToMinutes(e.hora_inicio.slice(0, 5))
    const fim = timeToMinutes(e.hora_fim.slice(0, 5))
    return novoIni < fim && ini < novoFim
  })
  if (conflita)
    return { error: "Este intervalo se sobrepõe a outro já cadastrado nesse dia." }

  const { error } = await supabase
    .from("availability")
    .insert({ barber_id, dia_semana, hora_inicio, hora_fim })
  if (error) return { error: "Não foi possível salvar o intervalo." }

  revalidatePath("/jornada")
  return { success: "Intervalo adicionado." }
}

export async function removeJornadaAction(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: intervalo } = await supabase
    .from("availability")
    .select("barber_id")
    .eq("id", id)
    .maybeSingle()
  if (!intervalo) return { error: "Intervalo não encontrado." }

  if (!(await podeGerenciar(intervalo.barber_id)))
    return { error: "Acesso negado." }

  const { error } = await supabase.from("availability").delete().eq("id", id)
  if (error) return { error: "Não foi possível remover o intervalo." }

  revalidatePath("/jornada")
  return { success: "Intervalo removido." }
}
