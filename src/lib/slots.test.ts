import { describe, it, expect } from "vitest"
import { computeSlots, mergeIntervals, type Interval } from "./slots"

// Dia base fixo (25/07/2026), em UTC — os testes são livres de fuso.
const DAY: [number, number, number] = [2026, 6, 25]

/** Instante UTC "HH:MM" do dia base. */
function at(h: number, m = 0, dayOffset = 0): number {
  return Date.UTC(DAY[0], DAY[1], DAY[2] + dayOffset, h, m)
}

/** Formata um instante de volta para "HH:MM" (UTC) para asserts legíveis. */
function hhmm(ms: number): string {
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, "0")
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`
}

function fmt(slots: number[]): string[] {
  return slots.map(hhmm)
}

const NO_BUSY: Interval[] = []
const FAR_PAST = at(0) // meia-noite: nada é "passado" nos testes padrão

describe("computeSlots — casos básicos", () => {
  it("gera slots de 30 min dentro de um intervalo simples", () => {
    const slots = computeSlots({
      working: [{ start: at(9), end: at(12) }],
      busy: NO_BUSY,
      durationMin: 30,
      nowMs: FAR_PAST,
    })
    expect(fmt(slots)).toEqual([
      "09:00",
      "09:30",
      "10:00",
      "10:30",
      "11:00",
      "11:30",
    ])
  })

  it("cenário do backlog: jornada 09–12, bloqueio 10:00–10:30, serviço 30min", () => {
    const slots = computeSlots({
      working: [{ start: at(9), end: at(12) }],
      busy: [{ start: at(10), end: at(10, 30) }],
      durationMin: 30,
      nowMs: FAR_PAST,
    })
    // Esperado: 09:00, 09:30, 10:30, 11:00, 11:30 (e NÃO 10:00)
    expect(fmt(slots)).toEqual(["09:00", "09:30", "10:30", "11:00", "11:30"])
    expect(fmt(slots)).not.toContain("10:00")
  })
})

describe("computeSlots — duração e encaixe (RN14)", () => {
  it("serviço maior que o intervalo restante não gera slots", () => {
    const slots = computeSlots({
      working: [{ start: at(9), end: at(10) }],
      busy: NO_BUSY,
      durationMin: 90,
      nowMs: FAR_PAST,
    })
    expect(slots).toEqual([])
  })

  it("serviço que preenche exatamente o intervalo gera 1 slot", () => {
    const slots = computeSlots({
      working: [{ start: at(9), end: at(9, 30) }],
      busy: NO_BUSY,
      durationMin: 30,
      nowMs: FAR_PAST,
    })
    expect(fmt(slots)).toEqual(["09:00"])
  })

  it("serviço de 60 min respeita o encaixe até o fim do intervalo", () => {
    const slots = computeSlots({
      working: [{ start: at(9), end: at(11) }],
      busy: NO_BUSY,
      durationMin: 60,
      nowMs: FAR_PAST,
    })
    // 09:00 (→10:00), 09:30 (→10:30), 10:00 (→11:00). 10:30 (→11:30) não cabe.
    expect(fmt(slots)).toEqual(["09:00", "09:30", "10:00"])
  })

  it("intervalo que não é múltiplo do passo trunca corretamente", () => {
    const slots = computeSlots({
      working: [{ start: at(9), end: at(10, 15) }],
      busy: NO_BUSY,
      durationMin: 30,
      nowMs: FAR_PAST,
    })
    // 09:00 (→09:30), 09:30 (→10:00). 10:00 (→10:30) ultrapassa 10:15.
    expect(fmt(slots)).toEqual(["09:00", "09:30"])
  })
})

describe("computeSlots — múltiplos intervalos", () => {
  it("gera slots ancorados em cada intervalo (manhã e tarde)", () => {
    const slots = computeSlots({
      working: [
        { start: at(9), end: at(12) },
        { start: at(13), end: at(15) },
      ],
      busy: NO_BUSY,
      durationMin: 60,
      nowMs: FAR_PAST,
    })
    expect(fmt(slots)).toEqual([
      "09:00",
      "09:30",
      "10:00",
      "10:30",
      "11:00",
      "13:00",
      "13:30",
      "14:00",
    ])
  })
})

describe("computeSlots — bloqueios e agendamentos", () => {
  it("agendamento ativo bloqueia como um time_off", () => {
    const slots = computeSlots({
      working: [{ start: at(9), end: at(11) }],
      busy: [{ start: at(9, 30), end: at(10) }],
      durationMin: 30,
      nowMs: FAR_PAST,
    })
    // 09:00 ok; 09:30 cruza; 10:00 ok; 10:30 ok
    expect(fmt(slots)).toEqual(["09:00", "10:00", "10:30"])
  })

  it("bloqueio nas bordas não remove slots adjacentes", () => {
    const slots = computeSlots({
      working: [{ start: at(9), end: at(11) }],
      busy: [{ start: at(10), end: at(10, 30) }],
      durationMin: 30,
      nowMs: FAR_PAST,
    })
    // 09:30 (→10:00) encosta em 10:00 mas não cruza; 10:30 (→11:00) encosta no fim do bloqueio
    expect(fmt(slots)).toEqual(["09:00", "09:30", "10:30"])
  })

  it("bloqueio cobrindo todo o intervalo zera os slots", () => {
    const slots = computeSlots({
      working: [{ start: at(9), end: at(12) }],
      busy: [{ start: at(8), end: at(13) }],
      durationMin: 30,
      nowMs: FAR_PAST,
    })
    expect(slots).toEqual([])
  })
})

describe("computeSlots — horários passados (RN15)", () => {
  it("descarta slots anteriores a agora", () => {
    const slots = computeSlots({
      working: [{ start: at(9), end: at(12) }],
      busy: NO_BUSY,
      durationMin: 30,
      nowMs: at(9, 40), // agora = 09:40
    })
    // remove 09:00 e 09:30; mantém 10:00 em diante
    expect(fmt(slots)).toEqual(["10:00", "10:30", "11:00", "11:30"])
  })

  it("inclui um slot que começa exatamente agora", () => {
    const slots = computeSlots({
      working: [{ start: at(9), end: at(11) }],
      busy: NO_BUSY,
      durationMin: 30,
      nowMs: at(9, 30),
    })
    expect(fmt(slots)).toContain("09:30")
    expect(fmt(slots)).not.toContain("09:00")
  })
})

describe("computeSlots — bordas diversas", () => {
  it("sem jornada configurada retorna vazio", () => {
    const slots = computeSlots({
      working: [],
      busy: NO_BUSY,
      durationMin: 30,
      nowMs: FAR_PAST,
    })
    expect(slots).toEqual([])
  })

  it("duração inválida (<= 0) retorna vazio", () => {
    const slots = computeSlots({
      working: [{ start: at(9), end: at(12) }],
      busy: NO_BUSY,
      durationMin: 0,
      nowMs: FAR_PAST,
    })
    expect(slots).toEqual([])
  })

  it("intervalo cruzando a meia-noite funciona (instantes absolutos)", () => {
    // 23:00 até 00:30 do dia seguinte, serviço 30 min
    const slots = computeSlots({
      working: [{ start: at(23), end: at(0, 30, 1) }],
      busy: NO_BUSY,
      durationMin: 30,
      nowMs: FAR_PAST,
    })
    expect(fmt(slots)).toEqual(["23:00", "23:30", "00:00"])
  })

  it("passo customizado de 15 min é respeitado", () => {
    const slots = computeSlots({
      working: [{ start: at(9), end: at(10) }],
      busy: NO_BUSY,
      durationMin: 30,
      stepMin: 15,
      nowMs: FAR_PAST,
    })
    expect(fmt(slots)).toEqual(["09:00", "09:15", "09:30"])
  })

  it("saída é ordenada mesmo com intervalos fora de ordem", () => {
    const slots = computeSlots({
      working: [
        { start: at(14), end: at(15) },
        { start: at(9), end: at(10) },
      ],
      busy: NO_BUSY,
      durationMin: 30,
      nowMs: FAR_PAST,
    })
    expect(fmt(slots)).toEqual(["09:00", "09:30", "14:00", "14:30"])
  })
})

describe("mergeIntervals", () => {
  it("une intervalos sobrepostos e adjacentes", () => {
    const merged = mergeIntervals([
      { start: at(9), end: at(10) },
      { start: at(10), end: at(11) },
      { start: at(10, 30), end: at(12) },
      { start: at(14), end: at(15) },
    ])
    expect(merged.map((m) => `${hhmm(m.start)}-${hhmm(m.end)}`)).toEqual([
      "09:00-12:00",
      "14:00-15:00",
    ])
  })

  it("lista vazia retorna vazio", () => {
    expect(mergeIntervals([])).toEqual([])
  })
})
