"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { AlertTriangle, Loader2, Plus } from "lucide-react"
import { toast } from "sonner"
import { addFolgaAction, type ConflitoAgendamento } from "@/actions/timeoff"
import {
  folgaFormSchema,
  type FolgaFormInput,
} from "@/lib/validations/config"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field } from "@/components/ui/field"

export function AddFolgaForm({ barberId }: { barberId: string }) {
  const [pending, startTransition] = useTransition()
  const [conflitos, setConflitos] = useState<ConflitoAgendamento[] | null>(null)
  const [pendentes, setPendentes] = useState<FolgaFormInput | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FolgaFormInput>({
    resolver: zodResolver(folgaFormSchema),
    defaultValues: { data: "", hora_inicio: "12:00", hora_fim: "13:00", motivo: "" },
  })

  function enviar(values: FolgaFormInput, confirmar: boolean) {
    startTransition(async () => {
      const res = await addFolgaAction({ ...values, barber_id: barberId }, confirmar)
      if ("error" in res) {
        toast.error(res.error)
      } else if ("conflicts" in res) {
        setConflitos(res.conflicts)
        setPendentes(values)
      } else {
        toast.success(res.success)
        setConflitos(null)
        setPendentes(null)
        reset()
      }
    })
  }

  const onSubmit = handleSubmit((values) => enviar(values, false))

  return (
    <div className="space-y-4 rounded-xl border border-border/70 bg-card p-5">
      <h2 className="text-lg">Novo bloqueio</h2>
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-4">
        <Field label="Data" htmlFor="data" error={errors.data?.message}>
          <Input id="data" type="date" aria-invalid={!!errors.data} {...register("data")} />
        </Field>
        <Field label="Início" htmlFor="hora_inicio" error={errors.hora_inicio?.message}>
          <Input id="hora_inicio" type="time" {...register("hora_inicio")} />
        </Field>
        <Field label="Fim" htmlFor="hora_fim" error={errors.hora_fim?.message}>
          <Input
            id="hora_fim"
            type="time"
            aria-invalid={!!errors.hora_fim}
            {...register("hora_fim")}
          />
        </Field>
        <Field label="Motivo (opcional)" htmlFor="motivo" error={errors.motivo?.message}>
          <Input id="motivo" placeholder="Ex.: Almoço" {...register("motivo")} />
        </Field>

        <div className="sm:col-span-4">
          <Button type="submit" disabled={pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Bloquear
          </Button>
        </div>
      </form>

      {conflitos && pendentes && (
        <div className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-4" />
            <span className="text-sm font-medium">
              Este bloqueio cobre {conflitos.length} agendamento(s) ativo(s):
            </span>
          </div>
          <ul className="ml-6 list-disc text-sm text-muted-foreground">
            {conflitos.map((c, i) => (
              <li key={i}>
                {c.quando} — {c.cliente}
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            Os agendamentos <strong>não</strong> serão cancelados automaticamente.
          </p>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              disabled={pending}
              onClick={() => enviar(pendentes, true)}
            >
              Bloquear mesmo assim
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => {
                setConflitos(null)
                setPendentes(null)
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
