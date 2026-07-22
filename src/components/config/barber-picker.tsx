"use client"

import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

export type PickerBarber = { id: string; nome: string; ativo: boolean }

/** Seletor de barbeiro (para admin) via query param ?b=<id>. */
export function BarberPicker({
  barbers,
  selectedId,
}: {
  barbers: PickerBarber[]
  selectedId: string
}) {
  const router = useRouter()
  const pathname = usePathname()

  if (barbers.length <= 1) return null

  return (
    <div className="flex flex-wrap gap-2">
      {barbers.map((b) => (
        <button
          key={b.id}
          type="button"
          onClick={() => router.push(`${pathname}?b=${b.id}`)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-sm transition-colors",
            b.id === selectedId
              ? "border-primary bg-primary/15 text-foreground"
              : "border-border/70 text-muted-foreground hover:bg-accent"
          )}
        >
          {b.nome}
          {!b.ativo && (
            <span className="ml-1.5 text-xs text-muted-foreground">(inativo)</span>
          )}
        </button>
      ))}
    </div>
  )
}
