import { useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { HeartHandshake, Home, Menu, Settings, Users, X } from 'lucide-react'
import { Link, matchPath, NavLink, useLocation } from 'react-router'
import { paths, routes } from '@/app/paths'
import logotipoOscuro from '@/assets/brand/caa-sp-logotipo-fondo-oscuro.svg'
import { LogoutButton } from '@/features/auth/components/LogoutButton'
import { useCurrentUser } from '@/features/auth/hooks'
import { useOrganizations } from '@/features/organizations/hooks'
import { SHARED_SPACE_ID, sharedPatients } from '@/features/organizations/spaces'
import { usePatients } from '@/features/patients/hooks'
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

const REAL_ITEMS = NAV_ITEMS.filter((item): item is NavItem & { to: string } => item.to !== null)
const PLANNED_ITEMS = NAV_ITEMS.filter((item) => item.to === null)

const ROW_CLASS = 'flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm lg:min-h-10'
const INTERACTIVE_CLASS =
  'text-muted-foreground no-underline outline-none transition-colors hover:bg-white/5 hover:text-white focus-visible:ring-2 focus-visible:ring-ring'
const CURRENT_CLASS = 'bg-white/10 font-semibold text-white'

/** The space the current URL is about, so the list marks it; validated only by matching a listed id. */
function currentSpaceId(pathname: string, search: string): string | null {
  if (pathname === routes.patients) return new URLSearchParams(search).get('espacio')
  return matchPath(routes.organizationMembers, pathname)?.params.organizacionId ?? null
}

function SpaceNavLink({ to, label, isCurrent, leading }: { to: string; label: string; isCurrent: boolean; leading: ReactNode }) {
  return (
    <Link
      to={to}
      title={label}
      aria-current={isCurrent ? 'true' : undefined}
      className={cn(ROW_CLASS, INTERACTIVE_CLASS, isCurrent && CURRENT_CLASS)}
    >
      {leading}
      <span className="truncate">{label}</span>
    </Link>
  )
}

function SpacesNav() {
  const location = useLocation()
  const { data: organizations } = useOrganizations()
  const { data: patients } = usePatients()
  const hasShared = !!patients && sharedPatients(patients).length > 0
  // Errors stay quiet here: the Dashboard and Pacientes report them where they can be retried.
  if (!organizations?.length && !hasShared) return null

  const current = currentSpaceId(location.pathname, location.search)

  return (
    <nav aria-labelledby="shell-spaces-title" className="flex min-h-0 flex-col gap-1">
      <span id="shell-spaces-title" className="px-3 pb-1 text-xs font-medium text-muted-foreground">
        Espacios
      </span>
      <div className="flex min-h-0 flex-col gap-0.5 overflow-y-auto">
        {organizations?.map((organization) => (
          <SpaceNavLink
            key={organization.id}
            to={paths.patientsInSpace(organization.id)}
            label={organization.nombre}
            isCurrent={current === organization.id}
            leading={
              <span
                aria-hidden="true"
                className="flex size-6 shrink-0 items-center justify-center rounded-md bg-caa-azul font-display text-xs font-bold text-white"
              >
                {initialOf(organization.nombre)}
              </span>
            }
          />
        ))}
        {hasShared && (
          <SpaceNavLink
            to={paths.patientsInSpace(SHARED_SPACE_ID)}
            label="Pacientes compartidos"
            isCurrent={current === SHARED_SPACE_ID}
            leading={<HeartHandshake aria-hidden="true" className="size-5 shrink-0" />}
          />
        )}
      </div>
    </nav>
  )
}

/**
 * Main shell navigation: a fixed column from `lg:`; below it, a top bar whose menu opens the same
 * content. The open menu remembers the location it was opened at, so any navigation closes it.
 */
export function Sidebar() {
  const { data: user } = useCurrentUser()
  const location = useLocation()
  const [openAt, setOpenAt] = useState<string | null>(null)
  const menuButton = useRef<HTMLButtonElement>(null)
  const isOpen = openAt === location.key

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && isOpen) {
      setOpenAt(null)
      menuButton.current?.focus()
    }
  }

  return (
    <aside
      onKeyDown={handleKeyDown}
      className="caa-brand caa-brand-dark sticky top-0 z-30 flex shrink-0 flex-col bg-caa-tinta text-white lg:h-dvh lg:w-64"
    >
      <div className="flex h-14 items-center justify-between px-4 lg:h-20 lg:px-6">
        <Link
          to={paths.dashboard()}
          aria-label="CAA_SP — ir al inicio"
          className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <img src={logotipoOscuro} alt="" className="h-7 w-auto" />
        </Link>
        <button
          ref={menuButton}
          type="button"
          aria-expanded={isOpen}
          aria-controls="shell-menu"
          aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
          onClick={() => setOpenAt(isOpen ? null : location.key)}
          className="-mr-1.5 flex size-11 items-center justify-center rounded-lg text-white outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
        >
          {isOpen ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
        </button>
      </div>

      {isOpen && (
        <div aria-hidden="true" onClick={() => setOpenAt(null)} className="fixed inset-0 top-14 bg-caa-tinta/50 lg:hidden" />
      )}

      <div
        id="shell-menu"
        className={cn(
          'absolute inset-x-0 top-14 max-h-[calc(100dvh-3.5rem)] flex-col gap-6 overflow-y-auto bg-caa-tinta px-3 pt-2 pb-4',
          'lg:static lg:flex lg:max-h-none lg:min-h-0 lg:flex-1 lg:overflow-hidden lg:pb-4',
          isOpen ? 'flex' : 'hidden',
        )}
      >
        <nav aria-label="Principal" className="flex flex-col gap-0.5">
          {REAL_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.label}
                to={item.to}
                end={item.to === paths.dashboard()}
                className={({ isActive }) => cn(ROW_CLASS, INTERACTIVE_CLASS, isActive && CURRENT_CLASS)}
              >
                <Icon aria-hidden="true" className="size-5 shrink-0" />
                {item.label}
              </NavLink>
            )
          })}
          {PLANNED_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <span
                key={item.label}
                title={`${item.label}: próximamente`}
                aria-disabled="true"
                className={cn(ROW_CLASS, 'text-muted-foreground/70')}
              >
                <Icon aria-hidden="true" className="size-5 shrink-0" />
                {item.label}
                <span className="ml-auto rounded bg-white/5 px-1.5 py-0.5 text-[0.6875rem]">Próximamente</span>
              </span>
            )
          })}
        </nav>

        <SpacesNav />

        <div className="mt-auto flex flex-col gap-1 border-t border-border pt-3">
          {user && (
            <div className="flex items-center gap-3 px-3 py-1.5">
              <span
                aria-hidden="true"
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-caa-tinta-panel text-sm font-semibold"
              >
                {initialOf(user.nombre)}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium" title={user.nombre}>
                  {user.nombre}
                </span>
                <span className="truncate text-xs text-muted-foreground" title={user.email}>
                  {user.email}
                </span>
              </span>
            </div>
          )}
          <LogoutButton inShell />
        </div>
      </div>
    </aside>
  )
}
