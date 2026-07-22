import { cn } from "@/lib/utils"

export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "border-t border-border/60 py-6 text-center text-xs text-muted-foreground",
        className
      )}
    >
      Desenvolvido por{" "}
      <span className="font-medium text-foreground/80">Bianghi Innovations</span>
    </footer>
  )
}
