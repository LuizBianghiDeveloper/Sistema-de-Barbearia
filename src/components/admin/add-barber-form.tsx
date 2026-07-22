"use client"

import { useState, useTransition } from "react"
import { Loader2, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { addBarberByEmailAction } from "@/actions/barbers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function AddBarberForm() {
  const [email, setEmail] = useState("")
  const [pending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await addBarberByEmailAction(email)
      if ("error" in res) {
        toast.error(res.error)
      } else {
        toast.success(res.success)
        setEmail("")
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
      <Input
        type="email"
        placeholder="e-mail do usuário já cadastrado"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="sm:max-w-xs"
        required
      />
      <Button type="submit" disabled={pending}>
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <UserPlus className="size-4" />
        )}
        Adicionar barbeiro
      </Button>
    </form>
  )
}
