import Link from "next/link"
import {
  CalendarClock,
  CalendarDays,
  ListChecks,
  Scissors,
  Users,
} from "lucide-react"
import { getSessionProfile, type Role } from "@/lib/auth"
import { cn } from "@/lib/utils"

type Feature = {
  title: string
  description: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: Role[]
  soon?: boolean
}

const FEATURES: Feature[] = [
  {
    title: "Agendar horário",
    description: "Escolha serviço, barbeiro e horário disponível.",
    href: "/agendar",
    icon: Scissors,
    roles: ["client"],
  },
  {
    title: "Meus agendamentos",
    description: "Veja e cancele seus horários.",
    href: "/meus-agendamentos",
    icon: ListChecks,
    roles: ["client"],
  },
  {
    title: "Minha agenda",
    description: "Sua agenda do dia e da semana.",
    href: "/agenda",
    icon: CalendarDays,
    roles: ["barber", "admin"],
  },
  {
    title: "Horários de trabalho",
    description: "Defina sua jornada semanal.",
    href: "/jornada",
    icon: CalendarClock,
    roles: ["barber", "admin"],
  },
  {
    title: "Bloqueios e folgas",
    description: "Marque períodos indisponíveis.",
    href: "/folgas",
    icon: CalendarClock,
    roles: ["barber", "admin"],
  },
  {
    title: "Mensalistas",
    description: "Horários fixos reservados toda semana.",
    href: "/mensalistas",
    icon: CalendarClock,
    roles: ["barber", "admin"],
  },
  {
    title: "Barbeiros",
    description: "Cadastre e gerencie os profissionais.",
    href: "/admin/barbeiros",
    icon: Users,
    roles: ["admin"],
  },
  {
    title: "Serviços",
    description: "Catálogo de serviços, duração e preço.",
    href: "/admin/servicos",
    icon: Scissors,
    roles: ["admin"],
  },
]

export default async function PainelPage() {
  const profile = await getSessionProfile()
  if (!profile) return null

  const features = FEATURES.filter((f) => f.roles.includes(profile.role))
  const primeiroNome = profile.nome.split(/\s+/)[0]

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Bem-vindo de volta,</p>
        <h1 className="text-3xl">{primeiroNome} 👋</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => {
          const Icon = f.icon
          const card = (
            <div
              className={cn(
                "group relative flex h-full flex-col gap-3 rounded-xl border border-border/70 bg-card p-5 transition-colors",
                f.soon
                  ? "opacity-60"
                  : "hover:border-primary/50 hover:bg-accent/40"
              )}
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Icon className="size-5" />
              </div>
              <div className="space-y-1">
                <h2 className="flex items-center gap-2 text-lg">
                  {f.title}
                  {f.soon && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      em breve
                    </span>
                  )}
                </h2>
                <p className="text-sm text-muted-foreground">{f.description}</p>
              </div>
            </div>
          )

          return f.soon ? (
            <div key={f.href}>{card}</div>
          ) : (
            <Link key={f.href} href={f.href}>
              {card}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
