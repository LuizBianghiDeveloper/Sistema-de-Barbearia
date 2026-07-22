"use client"

import { useTransition } from "react"
import { Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { cancelAppointmentAction } from "@/actions/appointments"
import { Button } from "@/components/ui/button"

export function CancelButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()

  function onClick() {
    startTransition(async () => {
      const res = await cancelAppointmentAction(id)
      if ("error" in res) toast.error(res.error)
      else toast.success(res.success)
    })
  }

  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={onClick}>
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <X className="size-4" />
      )}
      Cancelar
    </Button>
  )
}
