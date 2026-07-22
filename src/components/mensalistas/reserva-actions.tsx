"use client"

import { useTransition } from "react"
import { Loader2, Pause, Play, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  toggleReservaFixaAtivaAction,
  removeReservaFixaAction,
} from "@/actions/reservas"
import { Button } from "@/components/ui/button"

export function ReservaActions({ id, ativo }: { id: string; ativo: boolean }) {
  const [pending, startTransition] = useTransition()

  function toggle() {
    startTransition(async () => {
      const res = await toggleReservaFixaAtivaAction(id, !ativo)
      if ("error" in res) toast.error(res.error)
      else toast.success(res.success)
    })
  }

  function remover() {
    startTransition(async () => {
      const res = await removeReservaFixaAction(id)
      if ("error" in res) toast.error(res.error)
      else toast.success(res.success)
    })
  }

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="sm" disabled={pending} onClick={toggle}>
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : ativo ? (
          <Pause className="size-4" />
        ) : (
          <Play className="size-4" />
        )}
        {ativo ? "Pausar" : "Reativar"}
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={pending}
        onClick={remover}
        aria-label="Remover"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  )
}
