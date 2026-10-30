import { useEffect, useRef } from 'react'
import type { LucideIcon } from 'lucide-react'
import { NavLink, useLocation } from 'react-router'
import { cn } from '@/lib/utils'

export interface PatientSection {
  label: string
  to: string
  icon: LucideIcon
}

function sectionLinkClassName({ isActive }: { isActive: boolean }): string {
  return cn(
    '-mb-px flex min-h-11 shrink-0 items-center gap-2 rounded-t-md border-b-2 px-3 text-sm outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset',
    isActive
      ? 'border-caa-azul font-semibold text-foreground'
      : 'border-transparent font-medium text-muted-foreground hover:border-border hover:text-foreground',
  )
}

/**
 * Contextual subnavigation for one patient: icon, section name, active state — nothing else.
 * Every section's own primary action lives in its content header instead. When the row does not
 * fit (phones) it scrolls inside itself, keeping the current section in view.
 */
export function PatientSectionNav({ sections }: { sections: PatientSection[] }) {
  const nav = useRef<HTMLElement>(null)
  const { pathname } = useLocation()

  useEffect(() => {
    nav.current?.querySelector('[aria-current="page"]')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  }, [pathname])

  return (
    <nav
      ref={nav}
      aria-label="Secciones del paciente"
      className="-mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0"
    >
      {sections.map((section) => {
        const Icon = section.icon
        return (
          <NavLink key={section.to} to={section.to} className={sectionLinkClassName}>
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            {section.label}
          </NavLink>
        )
      })}
    </nav>
  )
}
