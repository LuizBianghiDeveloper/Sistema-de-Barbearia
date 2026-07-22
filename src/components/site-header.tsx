import Link from "next/link"
import { Brand } from "@/components/brand"
import { SignOutMenuItem } from "@/components/sign-out-button"
import { type Role, type SessionProfile } from "@/lib/auth"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

type NavItem = { label: string; href: string; roles: Role[]; soon?: boolean }

const NAV: NavItem[] = [
  { label: "Painel", href: "/painel", roles: ["client", "barber", "admin"] },
  { label: "Agendar", href: "/agendar", roles: ["client"] },
  { label: "Meus horários", href: "/meus-agendamentos", roles: ["client"] },
  { label: "Minha agenda", href: "/agenda", roles: ["barber", "admin"] },
  { label: "Jornada", href: "/jornada", roles: ["barber", "admin"] },
  { label: "Folgas", href: "/folgas", roles: ["barber", "admin"] },
  { label: "Barbeiros", href: "/admin/barbeiros", roles: ["admin"] },
  { label: "Serviços", href: "/admin/servicos", roles: ["admin"] },
]

const ROLE_LABEL: Record<Role, string> = {
  client: "Cliente",
  barber: "Barbeiro",
  admin: "Admin",
}

function initials(nome: string): string {
  const parts = nome.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?"
}

export function SiteHeader({ profile }: { profile: SessionProfile }) {
  const items = NAV.filter((i) => i.roles.includes(profile.role))

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Brand href="/painel" size="md" />

        <nav className="hidden items-center gap-1 md:flex">
          {items.map((item) =>
            item.soon ? (
              <span
                key={item.href}
                className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground/60"
                title="Em breve"
              >
                {item.label}
                <span className="rounded bg-muted px-1 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                  em breve
                </span>
              </span>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {item.label}
              </Link>
            )
          )}
        </nav>

        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                "flex items-center gap-2 rounded-full border border-border/70 py-1 pl-1 pr-3 text-sm",
                "transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-primary font-heading text-sm font-semibold text-primary-foreground">
                {initials(profile.nome)}
              </span>
              <span className="hidden max-w-[10rem] truncate sm:inline">
                {profile.nome}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex flex-col px-2 py-1.5">
                <span className="truncate text-sm font-medium">
                  {profile.nome}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {profile.email} · {ROLE_LABEL[profile.role]}
                </span>
              </div>
              <DropdownMenuSeparator />
              <SignOutMenuItem />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
