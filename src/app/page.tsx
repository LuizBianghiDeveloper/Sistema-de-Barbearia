import Link from "next/link";
import { redirect } from "next/navigation";
import { Scissors } from "lucide-react";
import { getSessionProfile } from "@/lib/auth";
import { Brand } from "@/components/brand";
import { SiteFooter } from "@/components/site-footer";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function Home() {
  const profile = await getSessionProfile();
  if (profile) redirect("/painel");

  return (
    <main className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Brand href="/" size="md" />
        <Link
          href="/login"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          Entrar
        </Link>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-16 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-1 text-xs text-muted-foreground">
          <Scissors className="size-3.5 text-primary" />
          Agendamento online
        </span>

        <h1 className="max-w-2xl text-5xl leading-[1.05] sm:text-6xl">
          Seu horário na barbearia,{" "}
          <span className="text-primary">sem complicação</span>.
        </h1>

        <p className="max-w-md text-muted-foreground">
          Escolha o serviço, o barbeiro e o horário disponível. Rápido, direto e
          quando for melhor pra você.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/cadastro"
            className={cn(buttonVariants({ size: "lg" }))}
          >
            Criar conta e agendar
          </Link>
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          >
            Já tenho conta
          </Link>
        </div>
      </section>

      <SiteFooter className="border-0" />
    </main>
  );
}
