"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Pencil, Plus } from "lucide-react"
import { toast } from "sonner"
import {
  createServicoAction,
  updateServicoAction,
} from "@/actions/services"
import { servicoSchema, type ServicoInput } from "@/lib/validations/config"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field } from "@/components/ui/field"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export type Servico = {
  id: string
  nome: string
  duracao_min: number
  preco: number
}

export function ServicoFormDialog({ servico }: { servico?: Servico }) {
  const isEdit = !!servico
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ServicoInput>({
    resolver: zodResolver(servicoSchema),
    defaultValues: servico
      ? { nome: servico.nome, duracao_min: servico.duracao_min, preco: servico.preco }
      : { nome: "", duracao_min: 30, preco: 0 },
  })

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const res = isEdit
        ? await updateServicoAction(servico!.id, values)
        : await createServicoAction(values)
      if ("error" in res) {
        toast.error(res.error)
      } else {
        toast.success(res.success)
        setOpen(false)
        if (!isEdit) reset({ nome: "", duracao_min: 30, preco: 0 })
      }
    })
  })

  return (
    <>
      {isEdit ? (
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          <Pencil className="size-4" />
          Editar
        </Button>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          Novo serviço
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Editar serviço" : "Novo serviço"}</DialogTitle>
            <DialogDescription>
              A duração alimenta o cálculo de horários disponíveis.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onSubmit} className="grid gap-4" noValidate>
            <Field label="Nome" htmlFor="nome" error={errors.nome?.message}>
              <Input
                id="nome"
                placeholder="Ex.: Corte de cabelo"
                aria-invalid={!!errors.nome}
                {...register("nome")}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Duração (min)"
                htmlFor="duracao_min"
                error={errors.duracao_min?.message}
              >
                <Input
                  id="duracao_min"
                  type="number"
                  min={1}
                  step={5}
                  aria-invalid={!!errors.duracao_min}
                  {...register("duracao_min", { valueAsNumber: true })}
                />
              </Field>

              <Field label="Preço (R$)" htmlFor="preco" error={errors.preco?.message}>
                <Input
                  id="preco"
                  type="number"
                  min={0}
                  step="0.01"
                  aria-invalid={!!errors.preco}
                  {...register("preco", { valueAsNumber: true })}
                />
              </Field>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="size-4 animate-spin" />}
                {isEdit ? "Salvar" : "Criar serviço"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
