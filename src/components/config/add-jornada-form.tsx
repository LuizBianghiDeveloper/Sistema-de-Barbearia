"use client"

import { useState, useTransition } from "react"
import { Loader2, Plus } from "lucide-react"
import { toast } from "sonner"
import { addJornadaAction } from "@/actions/availability"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function AddJornadaForm({
  barberId,
  diaSemana,
}: {
  barberId: string
  diaSemana: number
}) {
  const [inicio, setInicio] = useState("09:00")
  const [fim, setFim] = useState("12:00")
  const [pending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await addJornadaAction({
        barber_id: barberId,
        dia_semana: diaSemana,
        hora_inicio: inicio,
        hora_fim: fim,
      })
      if ("error" in res) toast.error(res.error)
      else toast.success(res.success)
    })
  }

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2">
      <Input
        type="time"
        value={inicio}
        onChange={(e) => setInicio(e.target.value)}
        className="w-[7.5rem]"
        aria-label="Início"
      />
      <span className="text-muted-foreground">–</span>
      <Input
        type="time"
        value={fim}
        onChange={(e) => setFim(e.target.value)}
        className="w-[7.5rem]"
        aria-label="Fim"
      />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Plus className="size-4" />
        )}
        Adicionar
      </Button>
    </form>
  )
}
