import { fromZonedTime, toZonedTime, formatInTimeZone } from "date-fns-tz"

/** Fuso oficial da barbearia (RN02). */
export const TZ = "America/Sao_Paulo"

export const DIAS_SEMANA = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
] as const

/**
 * Converte uma data/hora local (fuso da barbearia) para um Date em UTC,
 * pronto para gravar em timestamptz.
 * @param dateStr "2026-07-25"
 * @param timeStr "14:00"
 */
export function localToUtc(dateStr: string, timeStr: string): Date {
  return fromZonedTime(`${dateStr}T${timeStr}:00`, TZ)
}

/** Converte um instante UTC para o horário local da barbearia. */
export function utcToLocal(date: Date | string): Date {
  return toZonedTime(date, TZ)
}

/** Formata um instante no fuso da barbearia. */
export function formatLocal(date: Date | string, fmt: string): string {
  return formatInTimeZone(date, TZ, fmt)
}

/** "HH:mm" → minutos desde a meia-noite. */
export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}
