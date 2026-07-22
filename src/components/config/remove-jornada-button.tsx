"use client"

import { useTransition } from "react"
import { Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { removeJornadaAction } from "@/actions/availability"
import { Button } from "@/components/ui/button"

export function RemoveJornadaButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()

  function onClick() {
    startTransition(async () => {
      const res = await removeJornadaAction(id)
      if ("error" in res) toast.error(res.error)
      else toast.success(res.success)
    })
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      disabled={pending}
      onClick={onClick}
      aria-label="Remover intervalo"
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <X className="size-4" />
      )}
    </Button>
  )
}
