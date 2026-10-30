import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { paths } from '@/app/paths'
import { initialOf } from '@/lib/utils'
import { ageFrom } from '../age'
import { PERMISSION_LABELS } from '../format'
import type { Patient } from '../types'

interface PatientRowProps {
  patient: Patient
  /** Name of the patient's space, when the list mixes several. */
  spaceName?: string
}

/** One entry of the Pacientes directory: who it is, how the user relates to them, and the way in. */
export function PatientRow({ patient, spaceName }: PatientRowProps) {
  const age = ageFrom(patient.birthDate, new Date())
  const badge = patient.collaboratorPermission ? PERMISSION_LABELS[patient.collaboratorPermission] : null

  return (
    <Link
      to={paths.boards(patient.id)}
      data-focus-inset
      className="group flex min-h-16 items-center gap-3 px-4 py-3 outline-none transition-colors hover:bg-caa-niebla focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset sm:px-5"
    >
      <span className="sr-only">Abrir espacio de comunicación de </span>
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-caa-azul-suave font-display font-bold text-caa-azul"
      >
        {initialOf(patient.firstName)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-center sm:gap-4">
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-foreground" title={patient.fullName}>
            {patient.fullName}
          </span>
          {age !== null && (
            <span className="block text-sm text-muted-foreground">
              {age} {age === 1 ? 'año' : 'años'}
            </span>
          )}
        </span>
        {spaceName && (
          <span className="truncate text-sm text-muted-foreground sm:max-w-[40%]" title={spaceName}>
            {spaceName}
          </span>
        )}
        {badge && (
          <span className="mt-1 w-fit shrink-0 rounded-md bg-caa-cian-suave px-2 py-0.5 text-xs font-medium text-caa-cian-texto sm:mt-0">
            {badge}
          </span>
        )}
      </span>
      <ChevronRight
        aria-hidden="true"
        className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  )
}
