import Link from "next/link"
import Image from "next/image"
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
  const cfg = {
    sm: { img: "size-8", text: "text-base", showText: true },
    md: { img: "size-10", text: "text-xl", showText: true },
    lg: { img: "size-28", text: "text-2xl", showText: false },
  }[size]

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-3 text-foreground transition-opacity hover:opacity-90",
        size === "lg" && "flex-col gap-2",
        className
      )}
    >
      <Image
        src="/logo.png"
        alt="Lucas Simões Barbearia"
        width={224}
        height={224}
        priority
        className={cn("rounded-full", cfg.img)}
      />
      {cfg.showText && (
        <span className="flex flex-col leading-none">
          <span className={cn("brand", cfg.text)}>Lucas Simões</span>
          <span className="mt-0.5 text-[0.6rem] font-medium uppercase tracking-[0.35em] text-primary">
            Barbearia
          </span>
        </span>
      )}
    </Link>
  )
}
