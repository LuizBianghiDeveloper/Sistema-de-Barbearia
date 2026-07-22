import { describe, it, expect, afterEach } from "vitest"

/**
 * Teste de integração (ENB-11) — prevenção de double-booking sob concorrência.
 *
 * Roda contra o Supabase LOCAL. É pulado por padrão; ative com:
 *   RUN_DB_TESTS=1 npm test
 * (requer `npm run db:start` + `npm run db:reset`). O CI não tem banco e o pula.
 */

const RUN = process.env.RUN_DB_TESTS === "1"
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321"
// Chave service_role padrão do Supabase local (apenas desenvolvimento).
const SERVICE =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"

const BARBER = "aaaaaaaa-0000-0000-0000-000000000001"
const SERVICE_ID = "bbbbbbbb-0000-0000-0000-000000000001"
const MARKER = "__concurrency_test__"
const INICIO = "2099-01-05T13:00:00Z"
const FIM = "2099-01-05T13:30:00Z"

function headers() {
  return {
    apikey: SERVICE,
    Authorization: `Bearer ${SERVICE}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  }
}

function inserirAgendamento() {
  return fetch(`${URL}/rest/v1/appointments`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      barber_id: BARBER,
      service_id: SERVICE_ID,
      cliente_nome: MARKER,
      inicio: INICIO,
      fim: FIM,
      status: "confirmado",
    }),
  })
}

describe.skipIf(!RUN)("integração: anti double-booking (US-07 / RN17)", () => {
  afterEach(async () => {
    await fetch(`${URL}/rest/v1/appointments?cliente_nome=eq.${MARKER}`, {
      method: "DELETE",
      headers: headers(),
    })
  })

  it("dois agendamentos simultâneos no mesmo horário: só um é aceito", async () => {
    const [a, b] = await Promise.all([
      inserirAgendamento(),
      inserirAgendamento(),
    ])
    const sucessos = [a, b].filter((r) => r.status === 201).length
    const falhas = [a, b].filter((r) => r.status >= 400).length
    expect(sucessos).toBe(1)
    expect(falhas).toBe(1)
  })

  it("a exclusion constraint impede um segundo agendamento sobreposto", async () => {
    const primeiro = await inserirAgendamento()
    const segundo = await inserirAgendamento()
    expect(primeiro.status).toBe(201)
    expect(segundo.status).toBeGreaterThanOrEqual(400) // 23P01 → 409
  })
})
