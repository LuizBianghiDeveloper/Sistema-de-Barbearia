"use client"

import { LogOut } from "lucide-react"
import { signOutAction } from "@/actions/auth"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"

export function SignOutMenuItem() {
  return (
    <DropdownMenuItem variant="destructive" onClick={() => void signOutAction()}>
      <LogOut className="size-4" />
      Sair
    </DropdownMenuItem>
  )
}
