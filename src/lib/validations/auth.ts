import { z } from "zod"

const telefoneRegex = /^[0-9()+\-\s]{8,20}$/

export const cadastroSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome completo."),
  telefone: z
    .string()
    .trim()
    .regex(telefoneRegex, "Telefone inválido."),
  email: z.string().trim().email("E-mail inválido."),
  senha: z.string().min(6, "A senha deve ter ao menos 6 caracteres."),
})
export type CadastroInput = z.infer<typeof cadastroSchema>

export const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido."),
  senha: z.string().min(1, "Informe sua senha."),
})
export type LoginInput = z.infer<typeof loginSchema>

export const recuperarSenhaSchema = z.object({
  email: z.string().trim().email("E-mail inválido."),
})
export type RecuperarSenhaInput = z.infer<typeof recuperarSenhaSchema>

export const redefinirSenhaSchema = z
  .object({
    senha: z.string().min(6, "A senha deve ter ao menos 6 caracteres."),
    confirmar: z.string().min(6, "Confirme a senha."),
  })
  .refine((d) => d.senha === d.confirmar, {
    message: "As senhas não coincidem.",
    path: ["confirmar"],
  })
export type RedefinirSenhaInput = z.infer<typeof redefinirSenhaSchema>
