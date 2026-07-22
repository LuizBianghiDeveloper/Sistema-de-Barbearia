"use client"

import { usePathname, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

/** Seta de voltar no header — só no mobile e fora do painel (home). */
export function HeaderBackButton() {
  const pathname = usePathname()
  const router = useRouter()

  if (pathname === "/painel") return null

  function voltar() {
    if (window.history.length > 1) router.back()
    else router.push("/painel")
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={voltar}
      aria-label="Voltar"
      className="-ml-1 md:hidden"
    >
      <ArrowLeft className="size-5" />
    </Button>
  )
}
