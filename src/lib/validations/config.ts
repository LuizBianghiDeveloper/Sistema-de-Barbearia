import { z } from "zod"

const horaRegex = /^([01]\d|2[0-3]):[0-5]\d$/

// UUID genérico (8-4-4-4-12 hex). Menos estrito que z.uuid() do zod v4, que
// exige nibbles de versão/variante RFC — os IDs internos/seed não seguem isso.
const uuidish = z
  .string()
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    "Barbeiro inválido."
  )

// US-03 — Serviços
export const servicoSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do serviço."),
  duracao_min: z
    .number({ message: "Duração inválida." })
    .int("Duração deve ser um número inteiro.")
    .positive("Duração deve ser maior que zero."), // RN08
  preco: z
    .number({ message: "Preço inválido." })
    .min(0, "Preço não pode ser negativo."),
})
export type ServicoInput = z.infer<typeof servicoSchema>

// US-04 — Jornada (intervalo de trabalho)
export const jornadaSchema = z
  .object({
    barber_id: uuidish,
    dia_semana: z.coerce.number().int().min(0).max(6),
    hora_inicio: z.string().regex(horaRegex, "Horário inválido."),
    hora_fim: z.string().regex(horaRegex, "Horário inválido."),
  })
  .refine((d) => d.hora_fim > d.hora_inicio, {
    message: "O fim deve ser depois do início.", // RN10
    path: ["hora_fim"],
  })
export type JornadaInput = z.infer<typeof jornadaSchema>

// US-05 — Bloqueio / folga
export const folgaSchema = z
  .object({
    barber_id: uuidish,
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
    hora_inicio: z.string().regex(horaRegex, "Horário inválido."),
    hora_fim: z.string().regex(horaRegex, "Horário inválido."),
    motivo: z.string().trim().max(200).optional(),
  })
  .refine((d) => d.hora_fim > d.hora_inicio, {
    message: "O fim deve ser depois do início.",
    path: ["hora_fim"],
  })
export type FolgaInput = z.infer<typeof folgaSchema>

// Versão usada no formulário (o barber_id vem por contexto, não do form).
export const folgaFormSchema = z
  .object({
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
    hora_inicio: z.string().regex(horaRegex, "Horário inválido."),
    hora_fim: z.string().regex(horaRegex, "Horário inválido."),
    motivo: z.string().trim().max(200).optional(),
  })
  .refine((d) => d.hora_fim > d.hora_inicio, {
    message: "O fim deve ser depois do início.",
    path: ["hora_fim"],
  })
export type FolgaFormInput = z.infer<typeof folgaFormSchema>
