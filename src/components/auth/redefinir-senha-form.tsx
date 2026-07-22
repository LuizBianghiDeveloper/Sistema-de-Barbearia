"use client"

import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { redefinirSenhaAction } from "@/actions/auth"
import {
  redefinirSenhaSchema,
  type RedefinirSenhaInput,
} from "@/lib/validations/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field } from "@/components/ui/field"

export function RedefinirSenhaForm() {
  const [pending, startTransition] = useTransition()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RedefinirSenhaInput>({
    resolver: zodResolver(redefinirSenhaSchema),
    defaultValues: { senha: "", confirmar: "" },
  })

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const res = await redefinirSenhaAction(values)
      if (res && "error" in res) toast.error(res.error)
    })
  })

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <Field label="Nova senha" htmlFor="senha" error={errors.senha?.message}>
        <Input
          id="senha"
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo 6 caracteres"
          aria-invalid={!!errors.senha}
          {...register("senha")}
        />
      </Field>

      <Field
        label="Confirmar senha"
        htmlFor="confirmar"
        error={errors.confirmar?.message}
      >
        <Input
          id="confirmar"
          type="password"
          autoComplete="new-password"
          placeholder="Repita a senha"
          aria-invalid={!!errors.confirmar}
          {...register("confirmar")}
        />
      </Field>

      <Button type="submit" size="lg" disabled={pending} className="mt-2 w-full">
        {pending && <Loader2 className="size-4 animate-spin" />}
        Salvar nova senha
      </Button>
    </form>
  )
}
