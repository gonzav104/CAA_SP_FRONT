import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { paths } from '@/app/paths'
import { getReadErrorMessage } from '@/api/errors'
import { ErrorState } from '@/components/ErrorState'
import { LoadingState } from '@/components/LoadingState'
import { useCurrentUser } from '@/features/auth/hooks'
import { PageLayout } from '@/layouts/PageLayout'
import { formatBirthDate } from '../format'
import { usePatients } from '../hooks'
import type { Patient } from '../types'

const PERMISSION_LABELS = {
  LECTURA: 'Solo lectura',
  EDICION_LIMITADA: 'Edición limitada',
} as const

function PatientCard({ patient }: { patient: Patient }) {
  return (
    <li>
      <Link
        to={paths.boards(patient.id)}
        className="flex min-h-16 items-center justify-between gap-4 rounded-xl border bg-background px-5 py-3 outline-none transition-colors hover:border-foreground/30 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-base font-medium">{patient.fullName}</span>
          <span className="text-sm text-muted-foreground">
            Nacimiento: {formatBirthDate(patient.birthDate)}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-3">
          {patient.collaboratorPermission && (
            <span className="rounded-full border bg-muted px-2.5 py-0.5 text-xs font-medium">
              {PERMISSION_LABELS[patient.collaboratorPermission]}
            </span>
          )}
          <span className="flex items-center gap-1 text-sm font-medium text-primary">
            Ver cartillas
            <ChevronRight aria-hidden="true" className="size-4" />
          </span>
        </span>
      </Link>
    </li>
  )
}

export function PatientsPage() {
  const { data: user } = useCurrentUser()
  const { data: patients, isPending, isError, error, refetch } = usePatients()

  const emptyMessage =
    user?.rol === 'FAMILIAR'
      ? 'Todavía no tienes pacientes vinculados.'
      : 'Todavía no tienes pacientes registrados.'

  return (
    <PageLayout title="Pacientes">
      {isPending && !isError && <LoadingState message="Cargando pacientes…" />}
      {isError && (
        <ErrorState
          message={getReadErrorMessage(error, 'No se encontraron pacientes.')}
          onRetry={() => void refetch()}
        />
      )}
      {patients && patients.length === 0 && (
        <p className="rounded-xl border bg-background px-6 py-10 text-center text-muted-foreground">
          {emptyMessage}
        </p>
      )}
      {patients && patients.length > 0 && (
        <ul className="flex flex-col gap-3">
          {patients.map((patient) => (
            <PatientCard key={patient.id} patient={patient} />
          ))}
        </ul>
      )}
    </PageLayout>
  )
}
