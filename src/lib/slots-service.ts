import { createClient } from "@/lib/supabase/server"
import { computeSlots, type Interval } from "@/lib/slots"
import { localToUtc, formatLocal } from "@/lib/time"

export type Slot = {
  /** Instante de início em ISO/UTC (para gravar/confirmar o agendamento). */
  iso: string
  /** Rótulo "HH:mm" no fuso da barbearia (para exibição). */
  label: string
}

/** Próxima data (YYYY-MM-DD) — para delimitar o dia local. */
function proximaData(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  const next = new Date(Date.UTC(y, m - 1, d + 1))
  const p = (n: number) => String(n).padStart(2, "0")
  return `${next.getUTCFullYear()}-${p(next.getUTCMonth() + 1)}-${p(next.getUTCDate())}`
}

/** Dia da semana (0=domingo) de uma data-calendário, independente de fuso. */
function diaSemana(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

/**
 * Retorna os horários de início disponíveis para (barbeiro, serviço, data).
 * Orquestra os dados (jornada, ocupados) e delega o cálculo à função pura.
 */
export async function getAvailableSlots(
  barberId: string,
  serviceId: string,
  dateStr: string
): Promise<Slot[]> {
  const supabase = await createClient()

  const { data: service } = await supabase
    .from("services")
    .select("duracao_min, ativo")
    .eq("id", serviceId)
    .maybeSingle()

  if (!service || !service.ativo) return []

  // Jornada do dia da semana → intervalos de trabalho como instantes UTC.
  const dow = diaSemana(dateStr)
  const { data: avail } = await supabase
    .from("availability")
    .select("hora_inicio, hora_fim")
    .eq("barber_id", barberId)
    .eq("dia_semana", dow)

  const working: Interval[] = (avail ?? []).map((a) => ({
    start: localToUtc(dateStr, a.hora_inicio.slice(0, 5)).getTime(),
    end: localToUtc(dateStr, a.hora_fim.slice(0, 5)).getTime(),
  }))

  if (working.length === 0) return []

  // Ocupados no dia (via função SECURITY DEFINER: só início/fim).
  const from = localToUtc(dateStr, "00:00")
  const to = localToUtc(proximaData(dateStr), "00:00")

  const { data: busyRows } = await supabase.rpc("get_busy_intervals", {
    p_barber: barberId,
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  })

  const busy: Interval[] = (
    (busyRows ?? []) as { inicio: string; fim: string }[]
  ).map((r) => ({
    start: new Date(r.inicio).getTime(),
    end: new Date(r.fim).getTime(),
  }))

  const slots = computeSlots({
    working,
    busy,
    durationMin: service.duracao_min,
    nowMs: Date.now(),
  })

  return slots.map((ms) => ({
    iso: new Date(ms).toISOString(),
    label: formatLocal(new Date(ms), "HH:mm"),
  }))
}
