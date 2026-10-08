import type { LucideIcon } from 'lucide-react'
import { Home, Settings, Users } from 'lucide-react'
import { Link, NavLink } from 'react-router'
import { paths } from '@/app/paths'
import { PictogramGridMark } from '@/components/PictogramGridMark'
import { LogoutButton } from '@/features/auth/components/LogoutButton'
import { useCurrentUser } from '@/features/auth/hooks'
import { cn, initialOf } from '@/lib/utils'

interface NavItem {
  label: string
  /** `null`: the section is planned but has no screen yet — shown, never interactive. */
  to: string | null
  icon: LucideIcon
}

// Sesiones, Familia and Pictogramas are real today, but contextual to one patient
// (/pacientes/:id/...), not global destinations — a global "Sesiones" screen would mean one
// request per patient (N+1), which this shell deliberately does not do. Only Configuración
// remains genuinely planned.
const NAV_ITEMS: NavItem[] = [
  { label: 'Inicio', to: paths.dashboard(), icon: Home },
  { label: 'Pacientes', to: paths.patients(), icon: Users },
  { label: 'Configuración', to: null, icon: Settings },
]

const ROLE_LABELS = { TERAPEUTA: 'Terapeuta', FAMILIAR: 'Familiar' } as const

const REAL_ITEMS = NAV_ITEMS.filter((item): item is NavItem & { to: string } => item.to !== null)
const PLANNED_ITEMS = NAV_ITEMS.filter((item) => item.to === null)

function navLinkClassName({ isActive }: { isActive: boolean }): string {
  return cn(
    'flex w-full items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium no-underline outline-none transition-colors lg:justify-start',
    'focus-visible:ring-3 focus-visible:ring-sidebar-ring',
    isActive
      ? 'bg-caa-accent text-caa-on-accent'
      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
  )
}

/**
 * Main shell navigation. Full column from `lg:` (desktop and tablet landscape); a narrow,
 * icon-only rail below that (tablet portrait and mobile) — same structure, same links, just
 * without their text, so every item keeps an explicit `aria-label` regardless of width.
 */
export function Sidebar() {
  const { data: user } = useCurrentUser()

  return (
    <aside className="flex w-[76px] shrink-0 flex-col justify-between border-r border-sidebar-border bg-sidebar px-2.5 py-5 lg:w-64 lg:px-4">
      <div className="flex flex-col gap-8">
        <Link
          to={paths.dashboard()}
          aria-label="CAA SP — ir al inicio"
          className="flex items-center justify-center gap-2.5 rounded-md px-1 outline-none focus-visible:ring-3 focus-visible:ring-sidebar-ring lg:justify-start"
        >
          <PictogramGridMark />
          <span className="hidden text-lg font-semibold text-sidebar-foreground lg:inline">CAA SP</span>
        </Link>

        <div className="flex flex-col gap-4">
          <nav aria-label="Principal" className="flex flex-col gap-1">
            {REAL_ITEMS.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.label}
                  to={item.to}
                  end={item.to === paths.dashboard()}
                  aria-label={item.label}
                  className={navLinkClassName}
                >
                  <Icon aria-hidden="true" className="size-5 shrink-0" />
                  <span className="hidden lg:inline">{item.label}</span>
                </NavLink>
              )
            })}
          </nav>

          <div className="flex flex-col gap-1 border-t border-sidebar-border pt-4">
            <span className="hidden px-3 pb-1 text-xs font-medium text-sidebar-foreground/40 lg:block">
              Próximamente
            </span>
            {PLANNED_ITEMS.map((item) => {
              const Icon = item.icon
              return (
                <span
                  key={item.label}
                  title={`${item.label}: próximamente`}
                  aria-disabled="true"
                  className="flex w-full items-center justify-center gap-3 rounded-xl px-3 py-2 text-sm text-sidebar-foreground/40 lg:justify-start"
                >
                  <Icon aria-hidden="true" className="size-4 shrink-0" />
                  <span className="hidden lg:inline">{item.label}</span>
                </span>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-sidebar-border pt-4">
        {user && (
          <div className="flex items-center justify-center gap-2.5 px-1 lg:justify-start">
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground"
            >
              {initialOf(user.nombre)}
            </span>
            <span className="hidden min-w-0 flex-col lg:flex">
              <span className="truncate text-sm font-medium text-sidebar-foreground">{user.nombre}</span>
              <span className="text-xs text-sidebar-foreground/60">{ROLE_LABELS[user.rol]}</span>
            </span>
          </div>
        )}
        <div className="flex justify-center lg:justify-start">
          <LogoutButton responsive />
        </div>
      </div>
    </aside>
  )
}
