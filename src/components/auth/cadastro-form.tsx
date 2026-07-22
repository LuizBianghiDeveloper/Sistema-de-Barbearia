"use client"

import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { signUpAction } from "@/actions/auth"
import { cadastroSchema, type CadastroInput } from "@/lib/validations/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field } from "@/components/ui/field"

export function CadastroForm() {
  const [pending, startTransition] = useTransition()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CadastroInput>({
    resolver: zodResolver(cadastroSchema),
    defaultValues: { nome: "", telefone: "", email: "", senha: "" },
  })

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const res = await signUpAction(values)
      if (res && "error" in res) toast.error(res.error)
    })
  })

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <Field label="Nome completo" htmlFor="nome" error={errors.nome?.message}>
        <Input
          id="nome"
          autoComplete="name"
          placeholder="Seu nome"
          aria-invalid={!!errors.nome}
          {...register("nome")}
        />
      </Field>

      <Field label="Telefone" htmlFor="telefone" error={errors.telefone?.message}>
        <Input
          id="telefone"
          type="tel"
          autoComplete="tel"
          placeholder="(11) 99999-0000"
          aria-invalid={!!errors.telefone}
          {...register("telefone")}
        />
      </Field>

      <Field label="E-mail" htmlFor="email" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="voce@email.com"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
      </Field>

      <Field label="Senha" htmlFor="senha" error={errors.senha?.message}>
        <Input
          id="senha"
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo 6 caracteres"
          aria-invalid={!!errors.senha}
          {...register("senha")}
        />
      </Field>

      <Button type="submit" size="lg" disabled={pending} className="mt-2 w-full">
        {pending && <Loader2 className="size-4 animate-spin" />}
        Criar conta
      </Button>
    </form>
  )
}
