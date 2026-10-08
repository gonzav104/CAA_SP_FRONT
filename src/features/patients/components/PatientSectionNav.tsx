import type { LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router'
import { cn } from '@/lib/utils'

export interface PatientSection {
  label: string
  to: string
  icon: LucideIcon
}

function sectionLinkClassName({ isActive }: { isActive: boolean }): string {
  return cn(
    'flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
    isActive ? 'bg-caa-accent text-caa-on-accent' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
  )
}

/**
 * Contextual subnavigation for one patient: icon, section name, active state — nothing else.
 * Every section's own primary action lives in its content header instead. A single horizontal
 * pill row at every width; `flex-wrap` is a safety net, never a horizontally scrolling strip.
 */
export function PatientSectionNav({ sections }: { sections: PatientSection[] }) {
  return (
    <nav aria-label="Secciones del paciente" className="flex flex-wrap gap-1.5">
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
