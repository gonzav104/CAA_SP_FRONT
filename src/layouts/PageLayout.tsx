import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'
import { BRAND_TITLE_CLASS } from './brand'
import { Sidebar } from './Sidebar'

interface PageLayoutProps {
  /** Omit only when the page builds its own `<h1>` inside `children` (the Dashboard's decorated hero). */
  title?: ReactNode
  description?: string
  backLink?: { to: string; label: string }
  children: ReactNode
}

/**
 * Shell for every admin page: the sidebar (a column from `lg:`, a top bar with a menu below it)
 * plus a content plane, both in the brand scope. The Editor and Modo Uso render outside it, so
 * they keep their own look and typography.
 */
export function PageLayout({ title, description, backLink, children }: PageLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <Sidebar />
      <div className="caa-brand min-w-0 flex-1 bg-caa-niebla">
        <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
          {(backLink || title) && (
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
              {title && <h1 className={BRAND_TITLE_CLASS}>{title}</h1>}
              {description && <p className="text-muted-foreground">{description}</p>}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  )
}
