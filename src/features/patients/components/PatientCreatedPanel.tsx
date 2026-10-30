import { useEffect, useRef } from 'react'
import type { LucideIcon } from 'lucide-react'
import { CalendarPlus, Check, LayoutGrid, Stethoscope, UserPlus, X } from 'lucide-react'
import { Link } from 'react-router'
import { paths } from '@/app/paths'
import { canCreateBoard } from '@/features/boards/permissions'
import { canAccessCollaborators, canAccessSessions, canManageTherapists } from '../permissions'
import type { Patient } from '../types'

function nextSteps(patient: Patient): { label: string; to: string; icon: LucideIcon }[] {
  return [
    ...(canCreateBoard(patient) ? [{ label: 'Crear cartilla', to: `${paths.boards(patient.id)}?crear=1`, icon: LayoutGrid }] : []),
    ...(canManageTherapists(patient) ? [{ label: 'Asignar terapeuta', to: paths.therapists(patient.id), icon: Stethoscope }] : []),
    ...(canAccessCollaborators(patient)
      ? [{ label: 'Invitar familiar', to: `${paths.collaborators(patient.id)}?crear=1`, icon: UserPlus }]
      : []),
    ...(canAccessSessions(patient) ? [{ label: 'Registrar sesión', to: paths.sessionNew(patient.id), icon: CalendarPlus }] : []),
  ]
}

/**
 * Confirms a registration right after it, once: suggestions only, nothing here is required or automatic.
 * Each step is offered by the capabilities the backend returned for this patient.
 */
export function PatientCreatedPanel({ patient, onDismiss }: { patient: Patient; onDismiss: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null)
  const steps = nextSteps(patient)

  // The page changed under the user: moving the focus here is what announces the result.
  useEffect(() => heading.current?.focus(), [])

  return (
    <section
      aria-labelledby="patient-created-title"
      className="caa-brand flex flex-col gap-4 rounded-xl border border-border bg-background p-5"
    >
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-caa-cian-suave text-caa-cian-texto">
          <Check className="size-4" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2
            id="patient-created-title"
            ref={heading}
            tabIndex={-1}
            className="font-display font-bold text-foreground outline-none"
          >
            {`${patient.fullName} ya está en tu espacio`}
          </h2>
          {steps.length > 0 && <p className="text-sm text-muted-foreground">Cuando quieras, podés seguir por acá.</p>}
        </div>
        <button
          type="button"
          aria-label="Cerrar confirmación"
          onClick={onDismiss}
          className="-mt-1 -mr-1 flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-caa-niebla hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
      {steps.length > 0 && (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ label, to, icon: Icon }) => (
            <li key={label}>
              <Link
                to={to}
                className="flex min-h-11 items-center gap-2.5 rounded-lg border border-border px-3 text-sm font-medium text-foreground outline-none transition-colors hover:border-caa-azul/50 hover:bg-caa-niebla focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <Icon aria-hidden="true" className="size-4 shrink-0 text-caa-azul" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
