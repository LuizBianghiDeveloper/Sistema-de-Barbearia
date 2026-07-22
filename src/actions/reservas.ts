"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getSessionProfile } from "@/lib/auth"
import {
  reservaFixaFormSchema,
  type ReservaFixaFormInput,
} from "@/lib/validations/config"
import { timeToMinutes } from "@/lib/time"

export type ActionResult = { error: string } | { success: string }

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

export async function createReservaFixaAction(
  barberId: string,
  values: ReservaFixaFormInput
): Promise<ActionResult> {
  const parsed = reservaFixaFormSchema.safeParse(values)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  if (!(await podeGerenciar(barberId))) return { error: "Acesso negado." }

  const d = parsed.data
  if (d.data_fim && d.data_fim < d.data_inicio)
    return { error: "A data fim deve ser depois da data início." }

  const supabase = await createClient()

  const { data: service } = await supabase
    .from("services")
    .select("duracao_min, ativo")
    .eq("id", d.service_id)
    .maybeSingle()
  if (!service || !service.ativo)
    return { error: "Este serviço não está disponível." }

  // Conflito com outra reserva fixa ativa no mesmo dia da semana.
  const { data: existentes } = await supabase
    .from("reservas_fixas")
    .select("hora_inicio, service:services(duracao_min)")
    .eq("barber_id", barberId)
    .eq("dia_semana", d.dia_semana)
    .eq("ativo", true)

  const novoIni = timeToMinutes(d.hora_inicio)
  const novoFim = novoIni + service.duracao_min
  const conflita = (
    (existentes ?? []) as unknown as {
      hora_inicio: string
      service: { duracao_min: number } | null
    }[]
  ).some((e) => {
    const ini = timeToMinutes(e.hora_inicio.slice(0, 5))
    const fim = ini + (e.service?.duracao_min ?? 0)
    return novoIni < fim && ini < novoFim
  })
  if (conflita)
    return {
      error: "Já existe uma reserva fixa nesse dia/horário para este barbeiro.",
    }

  const profile = await getSessionProfile()
  const { error } = await supabase.from("reservas_fixas").insert({
    barber_id: barberId,
    service_id: d.service_id,
    cliente_nome: d.cliente_nome,
    cliente_telefone: d.cliente_telefone || null,
    dia_semana: d.dia_semana,
    hora_inicio: d.hora_inicio,
    data_inicio: d.data_inicio,
    data_fim: d.data_fim || null,
    criado_por: profile?.userId ?? null,
  })
  if (error) return { error: "Não foi possível criar a reserva fixa." }

  revalidatePath("/mensalistas")
  revalidatePath("/agenda")
  return { success: "Reserva fixa criada." }
}

export async function toggleReservaFixaAtivaAction(
  id: string,
  ativo: boolean
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: r } = await supabase
    .from("reservas_fixas")
    .select("barber_id")
    .eq("id", id)
    .maybeSingle()
  if (!r) return { error: "Reserva não encontrada." }
  if (!(await podeGerenciar(r.barber_id))) return { error: "Acesso negado." }

  const { error } = await supabase
    .from("reservas_fixas")
    .update({ ativo })
    .eq("id", id)
  if (error) return { error: "Não foi possível atualizar." }

  revalidatePath("/mensalistas")
  revalidatePath("/agenda")
  return { success: ativo ? "Reserva reativada." : "Reserva pausada." }
}

export async function removeReservaFixaAction(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: r } = await supabase
    .from("reservas_fixas")
    .select("barber_id")
    .eq("id", id)
    .maybeSingle()
  if (!r) return { error: "Reserva não encontrada." }
  if (!(await podeGerenciar(r.barber_id))) return { error: "Acesso negado." }

  const { error } = await supabase.from("reservas_fixas").delete().eq("id", id)
  if (error) return { error: "Não foi possível remover." }

  revalidatePath("/mensalistas")
  revalidatePath("/agenda")
  return { success: "Reserva removida." }
}
