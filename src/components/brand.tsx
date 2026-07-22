import Link from "next/link"
import { Scissors } from "lucide-react"
import { cn } from "@/lib/utils"

export function Brand({
  href = "/",
  className,
  size = "md",
}: {
  href?: string
  className?: string
  size?: "sm" | "md" | "lg"
}) {
  const sizes = {
    sm: { text: "text-lg", icon: "size-4" },
    md: { text: "text-xl", icon: "size-5" },
    lg: { text: "text-3xl", icon: "size-7" },
  }[size]

  return (
    <Link
      href={href}
      className={cn(
        "brand inline-flex items-center gap-2 text-foreground transition-opacity hover:opacity-90",
        sizes.text,
        className
      )}
    >
      <Scissors className={cn("text-primary", sizes.icon)} />
      <span>
        Barbearia<span className="text-primary">.</span>
      </span>
    </Link>
  )
}
