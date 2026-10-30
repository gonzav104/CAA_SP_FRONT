import type { ReactNode } from 'react'

interface AuthLayoutProps {
  title: string
  description?: string
  children: ReactNode
}

/** Centered card shared by the public auth screens (login, registro, contraseña). */
export function AuthLayout({ title, description, children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/40 p-6">
      <div className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-sm">
        <h1 className="text-xl font-semibold">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        {children}
      </div>
    </div>
  )
}

/** Inline link styled like the rest of the auth screens. */
export const authLinkClassName =
  'font-medium text-foreground underline underline-offset-4 outline-none hover:text-foreground/80 focus-visible:ring-3 focus-visible:ring-ring/50 rounded-sm'
