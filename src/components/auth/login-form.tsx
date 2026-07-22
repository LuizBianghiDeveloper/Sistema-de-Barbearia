"use client"

import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { signInAction } from "@/actions/auth"
import { loginSchema, type LoginInput } from "@/lib/validations/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field } from "@/components/ui/field"

export function LoginForm() {
  const [pending, startTransition] = useTransition()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", senha: "" },
  })

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const res = await signInAction(values)
      if (res && "error" in res) toast.error(res.error)
    })
  })

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
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
          autoComplete="current-password"
          placeholder="••••••••"
          aria-invalid={!!errors.senha}
          {...register("senha")}
        />
      </Field>

      <Button type="submit" size="lg" disabled={pending} className="mt-2 w-full">
        {pending && <Loader2 className="size-4 animate-spin" />}
        Entrar
      </Button>
    </form>
  )
}
