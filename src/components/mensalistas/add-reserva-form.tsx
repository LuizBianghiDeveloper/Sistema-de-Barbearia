"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Plus } from "lucide-react"
import { toast } from "sonner"
import { createReservaFixaAction } from "@/actions/reservas"
import {
  reservaFixaFormSchema,
  type ReservaFixaFormInput,
} from "@/lib/validations/config"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field } from "@/components/ui/field"
import { cn } from "@/lib/utils"

type Service = { id: string; nome: string; duracao_min: number }

const DIAS = [
  { v: 1, l: "Seg" },
  { v: 2, l: "Ter" },
  { v: 3, l: "Qua" },
  { v: 4, l: "Qui" },
  { v: 5, l: "Sex" },
  { v: 6, l: "Sáb" },
  { v: 0, l: "Dom" },
]

export function AddReservaForm({
  barberId,
  services,
  hoje,
}: {
  barberId: string
  services: Service[]
  hoje: string
}) {
  const [pending, startTransition] = useTransition()
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ReservaFixaFormInput>({
    resolver: zodResolver(reservaFixaFormSchema),
    defaultValues: {
      service_id: "",
      cliente_nome: "",
      cliente_telefone: "",
      dia_semana: 5,
      hora_inicio: "12:00",
      data_inicio: hoje,
      data_fim: "",
    },
  })

  const serviceId = watch("service_id")
  const diaSemana = watch("dia_semana")

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const res = await createReservaFixaAction(barberId, values)
      if ("error" in res) toast.error(res.error)
      else {
        toast.success(res.success)
        reset({
          service_id: "",
          cliente_nome: "",
          cliente_telefone: "",
          dia_semana: 5,
          hora_inicio: "12:00",
          data_inicio: hoje,
          data_fim: "",
        })
      }
    })
  })

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-xl border border-border/70 bg-card p-5"
      noValidate
    >
      <h2 className="text-lg">Novo mensalista</h2>

      <div className="grid gap-1.5">
        <span className="text-sm font-medium">Serviço</span>
        <div className="flex flex-wrap gap-2">
          {services.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setValue("service_id", s.id, { shouldValidate: true })}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                serviceId === s.id
                  ? "border-primary bg-primary/15"
                  : "border-border/70 hover:bg-accent"
              )}
            >
              {s.nome}{" "}
              <span className="text-muted-foreground">· {s.duracao_min}min</span>
            </button>
          ))}
        </div>
        {errors.service_id && (
          <p className="text-sm text-destructive">Selecione um serviço.</p>
        )}
      </div>

      <div className="grid gap-1.5">
        <span className="text-sm font-medium">Dia da semana</span>
        <div className="flex flex-wrap gap-2">
          {DIAS.map((d) => (
            <button
              key={d.v}
              type="button"
              onClick={() => setValue("dia_semana", d.v)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                diaSemana === d.v
                  ? "border-primary bg-primary/15"
                  : "border-border/70 hover:bg-accent"
              )}
            >
              {d.l}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Horário" htmlFor="hora_inicio" error={errors.hora_inicio?.message}>
          <Input id="hora_inicio" type="time" {...register("hora_inicio")} />
        </Field>
        <Field label="Nome do cliente" htmlFor="cliente_nome" error={errors.cliente_nome?.message}>
          <Input id="cliente_nome" placeholder="Nome" {...register("cliente_nome")} />
        </Field>
        <Field label="Telefone (opcional)" htmlFor="cliente_telefone">
          <Input id="cliente_telefone" type="tel" placeholder="(11) 99999-0000" {...register("cliente_telefone")} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Início" htmlFor="data_inicio" error={errors.data_inicio?.message}>
            <Input id="data_inicio" type="date" {...register("data_inicio")} />
          </Field>
          <Field label="Fim (opcional)" htmlFor="data_fim">
            <Input id="data_fim" type="date" {...register("data_fim")} />
          </Field>
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Plus className="size-4" />
        )}
        Criar reserva fixa
      </Button>
    </form>
  )
}
