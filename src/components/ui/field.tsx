import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

/** Linha de formulário: rótulo + controle + mensagem de erro. */
export function Field({
  label,
  htmlFor,
  error,
  className,
  children,
}: {
  label: string
  htmlFor: string
  error?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
