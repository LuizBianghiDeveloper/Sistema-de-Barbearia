"use client"

import { useTransition } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { toggleBarberAtivoAction } from "@/actions/barbers"
import { Button } from "@/components/ui/button"

export function ToggleBarberButton({
  barberId,
  ativo,
}: {
  barberId: string
  ativo: boolean
}) {
  const [pending, startTransition] = useTransition()

  function onClick() {
    startTransition(async () => {
      const res = await toggleBarberAtivoAction(barberId, !ativo)
      if ("error" in res) toast.error(res.error)
      else toast.success(res.success)
    })
  }

  return (
    <Button
      variant={ativo ? "outline" : "default"}
      size="sm"
      disabled={pending}
      onClick={onClick}
    >
      {pending && <Loader2 className="size-4 animate-spin" />}
      {ativo ? "Desativar" : "Ativar"}
    </Button>
  )
}
