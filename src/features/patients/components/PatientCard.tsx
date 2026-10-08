import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { paths } from '@/app/paths'
import { initialOf } from '@/lib/utils'
import { ageFrom } from '../age'
import { PERMISSION_LABELS } from '../format'
import type { Patient } from '../types'

interface PatientCardProps {
  patient: Patient
}

/**
 * The one patient card used everywhere a patient is shown as an entry point (Dashboard quick
 * access, the Pacientes directory): same identity, same affordance, same visual language.
 */
export function PatientCard({ patient }: PatientCardProps) {
  const age = ageFrom(patient.birthDate, new Date())

  return (
    <Link
      to={paths.boards(patient.id)}
      aria-label={`Abrir espacio de comunicación de ${patient.fullName}`}
      className="group flex flex-col gap-4 rounded-2xl border border-border/60 bg-background p-5 outline-none transition-colors hover:border-caa-accent/50 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div className="flex items-start justify-between gap-3">
        <span
          aria-hidden="true"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-caa-accent/10 text-sm font-semibold text-caa-accent"
        >
          {initialOf(patient.firstName)}
        </span>
        {patient.collaboratorPermission && (
          <span className="shrink-0 rounded-full border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {PERMISSION_LABELS[patient.collaboratorPermission]}
          </span>
        )}
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate font-medium text-foreground">{patient.fullName}</span>
          {age !== null && (
            <span className="text-sm text-muted-foreground">
              {age} {age === 1 ? 'año' : 'años'}
            </span>
          )}
        </div>
        <ChevronRight
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground transition-[transform,color] group-hover:translate-x-0.5 group-hover:text-caa-accent"
        />
      </div>
    </Link>
  )
}
