export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-6 shadow-sm">
      <div className="space-y-1">
        <h1 className="text-2xl">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="mt-6">{children}</div>
      {footer && (
        <div className="mt-6 border-t border-border/60 pt-4 text-center text-sm text-muted-foreground">
          {footer}
        </div>
      )}
    </div>
  )
}
