import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'
import { paths } from '@/app/paths'
import { LogoutButton } from '@/features/auth/components/LogoutButton'
import { useCurrentUser } from '@/features/auth/hooks'

interface PageLayoutProps {
  title: string
  description?: string
  backLink?: { to: string; label: string }
  children: ReactNode
}

/** Shell for the list pages: slim top bar and a centered content column (no sidebar). */
export function PageLayout({ title, description, backLink, children }: PageLayoutProps) {
  const { data: user } = useCurrentUser()

  return (
    <div className="flex min-h-dvh flex-col bg-muted/40">
      <header className="flex items-center justify-between gap-4 border-b bg-background px-6 py-3">
        <Link to={paths.patients()} className="rounded-md text-lg font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          CAA SP
        </Link>
        <div className="flex items-center gap-3">
          {user && <span className="text-sm text-muted-foreground">{user.nombre}</span>}
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-8">
        <div className="flex flex-col gap-2">
          {backLink && (
            <Link
              to={backLink.to}
              className="inline-flex min-h-10 w-fit items-center gap-1.5 rounded-md text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              {backLink.label}
            </Link>
          )}
          <h1 className="text-2xl font-semibold">{title}</h1>
          {description && <p className="text-muted-foreground">{description}</p>}
        </div>
        {children}
      </main>
    </div>
  )
}
