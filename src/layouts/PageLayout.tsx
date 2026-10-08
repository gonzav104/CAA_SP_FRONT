import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'
import { cn } from '@/lib/utils'
import { Sidebar } from './Sidebar'

interface PageLayoutProps {
  /** Omit only when the page builds its own `<h1>` inside `children` (the Dashboard's decorated hero). */
  title?: ReactNode
  description?: string
  backLink?: { to: string; label: string }
  /** `warm`: the quieter off-white content plane for the Dashboard. Every other admin page keeps the neutral tone. */
  tone?: 'neutral' | 'warm'
  children: ReactNode
}

/**
 * Shell for every admin page: a persistent sidebar (full nav from `lg:`, an icon rail below it)
 * plus a content plane. `font-caa` (Atkinson Hyperlegible Next) is scoped to this subtree only —
 * it never touches the global `--font-sans` token, so the Editor (which renders outside
 * PageLayout) keeps its own typography untouched.
 */
export function PageLayout({ title, description, backLink, tone = 'neutral', children }: PageLayoutProps) {
  return (
    <div className="flex min-h-dvh font-caa">
      <Sidebar />
      <div className={cn('min-w-0 flex-1', tone === 'warm' ? 'bg-[oklch(0.98_0.008_78)]' : 'bg-muted/40')}>
        <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8 lg:px-10 lg:py-10">
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
              {title && <h1 className="text-2xl font-semibold text-foreground">{title}</h1>}
              {description && <p className="text-muted-foreground">{description}</p>}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  )
}
