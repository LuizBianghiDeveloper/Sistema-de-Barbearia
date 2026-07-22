"use client"

import { useTransition } from "react"
import { Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { cancelAppointmentByBarberAction } from "@/actions/appointments"
import { Button } from "@/components/ui/button"

export function CancelAgendaButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()

  function onClick() {
    startTransition(async () => {
      const res = await cancelAppointmentByBarberAction(id)
      if ("error" in res) toast.error(res.error)
      else toast.success(res.success)
    })
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      disabled={pending}
      onClick={onClick}
      aria-label="Cancelar agendamento"
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <X className="size-4" />
      )}
    </Button>
  )
}
