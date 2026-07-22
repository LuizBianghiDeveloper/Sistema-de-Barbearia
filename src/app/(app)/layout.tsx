import { redirect } from "next/navigation"
import { getSessionProfile } from "@/lib/auth"
import { SiteHeader } from "@/components/site-header"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getSessionProfile()
  if (!profile) redirect("/login")

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader profile={profile} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  )
}
