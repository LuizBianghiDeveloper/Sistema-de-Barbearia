"use client"

import { useTransition } from "react"
import { Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { removeFolgaAction } from "@/actions/timeoff"
import { Button } from "@/components/ui/button"

export function RemoveFolgaButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()

  function onClick() {
    startTransition(async () => {
      const res = await removeFolgaAction(id)
      if ("error" in res) toast.error(res.error)
      else if ("success" in res) toast.success(res.success)
    })
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      disabled={pending}
      onClick={onClick}
      aria-label="Remover bloqueio"
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Trash2 className="size-4" />
      )}
    </Button>
  )
}
