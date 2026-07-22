"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, MailCheck } from "lucide-react"
import { toast } from "sonner"
import { recuperarSenhaAction } from "@/actions/auth"
import {
  recuperarSenhaSchema,
  type RecuperarSenhaInput,
} from "@/lib/validations/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field } from "@/components/ui/field"

export function RecuperarSenhaForm() {
  const [pending, startTransition] = useTransition()
  const [enviado, setEnviado] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RecuperarSenhaInput>({
    resolver: zodResolver(recuperarSenhaSchema),
    defaultValues: { email: "" },
  })

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const res = await recuperarSenhaAction(values)
      if ("error" in res) toast.error(res.error)
      else setEnviado(res.success)
    })
  })

  if (enviado) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
          <MailCheck className="size-6" />
        </div>
        <p className="text-sm text-muted-foreground">{enviado}</p>
      </div>
    )
  }

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

      <Button type="submit" size="lg" disabled={pending} className="mt-2 w-full">
        {pending && <Loader2 className="size-4 animate-spin" />}
        Enviar link de recuperação
      </Button>
    </form>
  )
}
