"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getSessionProfile } from "@/lib/auth"
import { getAvailableSlots, type Slot } from "@/lib/slots-service"
import { formatLocal } from "@/lib/time"

export type CreateResult =
  | { error: string }
  | { success: string; id: string }

export type CancelResult = { error: string } | { success: string }

const CANCEL_MIN_MS = 12 * 60 * 60 * 1000 // RN20: 12 horas

/** Horários livres para (barbeiro, serviço, data) — consumido pelo wizard. */
export async function getSlotsAction(
  barberId: string,
  serviceId: string,
  dateStr: string
): Promise<Slot[]> {
  const profile = await getSessionProfile()
  if (!profile) return []
  return getAvailableSlots(barberId, serviceId, dateStr)
}

/** Cria um agendamento para o cliente autenticado (US-07). */
export async function createAppointmentAction(input: {
  barberId: string
  serviceId: string
  inicioIso: string
}): Promise<CreateResult> {
  const profile = await getSessionProfile()
  if (!profile) return { error: "Sua sessão expirou. Entre novamente." }

  const supabase = await createClient()

  // Serviço e barbeiro precisam estar ativos no momento da confirmação.
  const { data: service } = await supabase
    .from("services")
    .select("duracao_min, ativo")
    .eq("id", input.serviceId)
    .maybeSingle()
  if (!service || !service.ativo)
    return { error: "Este serviço não está mais disponível." }

  const { data: barber } = await supabase
    .from("barbers")
    .select("ativo")
    .eq("id", input.barberId)
    .maybeSingle()
  if (!barber || !barber.ativo)
    return { error: "Este barbeiro não está mais disponível." }

  // Revalida que o horário ainda é oferecido (evita passado/fora da jornada/
  // bloqueado, além do anti-double-booking garantido pelo banco).
  const dateStr = formatLocal(input.inicioIso, "yyyy-MM-dd")
  const slots = await getAvailableSlots(input.barberId, input.serviceId, dateStr)
  const inicioMs = new Date(input.inicioIso).getTime()
  const disponivel = slots.some((s) => new Date(s.iso).getTime() === inicioMs)
  if (!disponivel)
    return { error: "Esse horário não está mais disponível. Escolha outro." }

  const fimIso = new Date(inicioMs + service.duracao_min * 60_000).toISOString()

  const { data, error } = await supabase
    .from("appointments")
    .insert({
      barber_id: input.barberId,
      service_id: input.serviceId,
      client_id: profile.userId,
      inicio: input.inicioIso,
      fim: fimIso,
      status: "confirmado", // RN24
      criado_por: profile.userId,
    })
    .select("id")
    .single()

  if (error) {
    // 23P01 = exclusion_violation → dois clientes no mesmo horário (RN17).
    if (error.code === "23P01")
      return {
        error: "Esse horário acabou de ser reservado. Escolha outro, por favor.",
      }
    return { error: "Não foi possível concluir o agendamento." }
  }

  revalidatePath("/meus-agendamentos")
  return { success: "Agendamento confirmado!", id: data.id }
}

/** Cliente cancela o próprio agendamento (US-08), respeitando a antecedência. */
export async function cancelAppointmentAction(
  appointmentId: string
): Promise<CancelResult> {
  const profile = await getSessionProfile()
  if (!profile) return { error: "Sua sessão expirou. Entre novamente." }

  const supabase = await createClient()

  const { data: appt } = await supabase
    .from("appointments")
    .select("inicio, status, client_id")
    .eq("id", appointmentId)
    .maybeSingle()

  if (!appt) return { error: "Agendamento não encontrado." }
  if (appt.status === "cancelado")
    return { error: "Este agendamento já está cancelado." }

  // RN20: mínimo de 12h de antecedência.
  const inicioMs = new Date(appt.inicio).getTime()
  if (inicioMs - Date.now() < CANCEL_MIN_MS)
    return {
      error:
        "Cancelamento só é permitido com no mínimo 12h de antecedência. Entre em contato com a barbearia.",
    }

  const { error } = await supabase
    .from("appointments")
    .update({ status: "cancelado" })
    .eq("id", appointmentId)

  if (error) return { error: "Não foi possível cancelar." }

  revalidatePath("/meus-agendamentos")
  return { success: "Agendamento cancelado." }
}

// ---------------------------------------------------------------------
// US-10 — Barbeiro/admin gerencia agendamentos na própria agenda
// ---------------------------------------------------------------------

/** O usuário atual pode agir na agenda deste barbeiro? (dono ou admin) */
async function podeGerenciarAgenda(barberId: string): Promise<boolean> {
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

/** Barbeiro cria agendamento para cliente avulso (RN25) na própria agenda. */
export async function createAppointmentByBarberAction(input: {
  barberId: string
  serviceId: string
  inicioIso: string
  clienteNome: string
  clienteTelefone?: string
}): Promise<CreateResult> {
  const profile = await getSessionProfile()
  if (!profile) return { error: "Sua sessão expirou. Entre novamente." }
  if (!(await podeGerenciarAgenda(input.barberId)))
    return { error: "Acesso negado." }

  const nome = input.clienteNome.trim()
  if (nome.length < 2) return { error: "Informe o nome do cliente." }

  const supabase = await createClient()

  const { data: service } = await supabase
    .from("services")
    .select("duracao_min, ativo")
    .eq("id", input.serviceId)
    .maybeSingle()
  if (!service || !service.ativo)
    return { error: "Este serviço não está disponível." }

  // Reaproveita o motor de slots para validar o horário.
  const dateStr = formatLocal(input.inicioIso, "yyyy-MM-dd")
  const slots = await getAvailableSlots(input.barberId, input.serviceId, dateStr)
  const inicioMs = new Date(input.inicioIso).getTime()
  if (!slots.some((s) => new Date(s.iso).getTime() === inicioMs))
    return { error: "Esse horário não está disponível. Escolha outro." }

  const fimIso = new Date(inicioMs + service.duracao_min * 60_000).toISOString()

  const { data, error } = await supabase
    .from("appointments")
    .insert({
      barber_id: input.barberId,
      service_id: input.serviceId,
      client_id: null,
      cliente_nome: nome,
      cliente_telefone: input.clienteTelefone?.trim() || null,
      inicio: input.inicioIso,
      fim: fimIso,
      status: "confirmado",
      criado_por: profile.userId,
    })
    .select("id")
    .single()

  if (error) {
    if (error.code === "23P01")
      return { error: "Esse horário acabou de ser reservado. Escolha outro." }
    return { error: "Não foi possível criar o agendamento." }
  }

  revalidatePath("/agenda")
  return { success: "Agendamento criado!", id: data.id }
}

/** Barbeiro/admin cancela um agendamento da própria agenda (sem regra de 12h). */
export async function cancelAppointmentByBarberAction(
  appointmentId: string
): Promise<CancelResult> {
  const profile = await getSessionProfile()
  if (!profile) return { error: "Sua sessão expirou. Entre novamente." }

  const supabase = await createClient()
  const { data: appt } = await supabase
    .from("appointments")
    .select("status, barber_id")
    .eq("id", appointmentId)
    .maybeSingle()

  if (!appt) return { error: "Agendamento não encontrado." }
  if (!(await podeGerenciarAgenda(appt.barber_id)))
    return { error: "Acesso negado." }
  if (appt.status === "cancelado")
    return { error: "Este agendamento já está cancelado." }

  const { error } = await supabase
    .from("appointments")
    .update({ status: "cancelado" })
    .eq("id", appointmentId)

  if (error) return { error: "Não foi possível cancelar." }

  revalidatePath("/agenda")
  return { success: "Agendamento cancelado." }
}
