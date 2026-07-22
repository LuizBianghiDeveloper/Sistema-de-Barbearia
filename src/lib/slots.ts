/**
 * Motor de disponibilidade (US-06) — função PURA e testável.
 *
 * Trabalha inteiramente com instantes absolutos em milissegundos (epoch),
 * de modo que a lógica de geração/filtragem de slots fica livre de fuso
 * horário. A conversão dos horários locais da jornada (America/Sao_Paulo)
 * para instantes UTC acontece FORA daqui (ver slots-service.ts), o que
 * mantém esta função determinística e trivial de testar.
 *
 * Regras (backlog):
 *  - RN14: um slot só vale se `inicio + duração` couber num intervalo de
 *    trabalho, sem interseção com bloqueios/agendamentos ativos.
 *  - RN15: não oferecer slots no passado (start < agora).
 *  - RN16: passo de geração fixo de 30 min (parametrizável, default 30).
 *
 * Todos os intervalos são meio-abertos: [start, end).
 */

export type Interval = {
  /** Instante de início (epoch ms), inclusivo. */
  start: number
  /** Instante de fim (epoch ms), exclusivo. */
  end: number
}

export type ComputeSlotsParams = {
  /** Intervalos de trabalho do dia (instantes UTC). */
  working: Interval[]
  /** Períodos ocupados: bloqueios (time_off) + agendamentos ativos. */
  busy: Interval[]
  /** Duração do serviço, em minutos. */
  durationMin: number
  /** Passo de geração dos slots, em minutos (default 30 — RN16). */
  stepMin?: number
  /** "Agora" (epoch ms) para descartar horários passados (RN15). */
  nowMs: number
}

const MIN = 60_000

/** Duas faixas [aStart,aEnd) e [bStart,bEnd) se cruzam? */
function overlaps(aStart: number, aEnd: number, b: Interval): boolean {
  return aStart < b.end && b.start < aEnd
}

/**
 * Calcula os instantes de início disponíveis (epoch ms), ordenados.
 */
export function computeSlots({
  working,
  busy,
  durationMin,
  stepMin = 30,
  nowMs,
}: ComputeSlotsParams): number[] {
  if (durationMin <= 0) return []
  const step = (stepMin > 0 ? stepMin : 30) * MIN
  const duration = durationMin * MIN

  const slots: number[] = []

  // Ordena os intervalos de trabalho para uma saída estável.
  const intervals = [...working].sort((a, b) => a.start - b.start)

  for (const w of intervals) {
    // Slots ancorados no início do intervalo, de `step` em `step`,
    // enquanto o serviço couber inteiro dentro do intervalo (RN14).
    for (let start = w.start; start + duration <= w.end; start += step) {
      const end = start + duration

      if (start < nowMs) continue // RN15: nada no passado
      if (busy.some((b) => overlaps(start, end, b))) continue // RN14

      slots.push(start)
    }
  }

  // Ordena e remove duplicatas (intervalos de trabalho não deveriam se
  // sobrepor, mas a dedupe torna a função robusta).
  return Array.from(new Set(slots)).sort((a, b) => a - b)
}

/**
 * Une intervalos ocupados que se tocam/sobrepõem (útil para normalizar
 * bloqueios + agendamentos antes de exibir "livre/ocupado", se necessário).
 */
export function mergeIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) return []
  const sorted = [...intervals].sort((a, b) => a.start - b.start)
  const merged: Interval[] = [{ ...sorted[0] }]
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1]
    const cur = sorted[i]
    if (cur.start <= last.end) {
      last.end = Math.max(last.end, cur.end)
    } else {
      merged.push({ ...cur })
    }
  }
  return merged
}
