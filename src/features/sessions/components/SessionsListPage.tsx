import { CalendarDays, Plus } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router'
import { paths } from '@/app/paths'
import { getReadErrorMessage } from '@/api/errors'
import { EmptyPanel } from '@/components/EmptyPanel'
import { ErrorState } from '@/components/ErrorState'
import { RowsSkeleton } from '@/components/RowsSkeleton'
import { buttonVariants } from '@/components/ui/button'
import { BRAND_SECTION_TITLE_CLASS } from '@/layouts/brand'
import { cn } from '@/lib/utils'
import { useSessions } from '../hooks'
import { SessionSummaryRow } from './SessionSummaryRow'

/** Sesiones tab of the patient workspace: a summarized, most-recent-first history. */
export function SessionsListPage() {
  const { pacienteId } = useParams()
  if (!pacienteId) return <Navigate to={paths.patients()} replace />
  return <SessionsListPageContent patientId={pacienteId} />
}

function SessionsListPageContent({ patientId }: { patientId: string }) {
  const { data: sessions, isPending, isError, error, refetch } = useSessions(patientId)

  if (isPending) return <RowsSkeleton message="Cargando sesiones…" />
  if (isError) {
    return (
      <ErrorState
        message={getReadErrorMessage(error, 'No encontramos sesiones para este paciente o no tenés acceso.')}
        onRetry={() => void refetch()}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className={BRAND_SECTION_TITLE_CLASS}>Sesiones</h2>
        {sessions.length > 0 && (
          <Link
            to={paths.sessionNew(patientId)}
            className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-10')}
          >
            <Plus aria-hidden="true" />
            Registrar sesión
          </Link>
        )}
      </div>

      {sessions.length === 0 ? (
        <EmptyPanel
          icon={CalendarDays}
          hint="Cada sesión guarda los objetivos trabajados y las observaciones del encuentro."
          action={
            <Link to={paths.sessionNew(patientId)} className={cn(buttonVariants({ size: 'lg' }), 'h-10')}>
              <Plus aria-hidden="true" />
              Registrar sesión
            </Link>
          }
        >
          Todavía no hay sesiones registradas.
        </EmptyPanel>
      ) : (
        <ul className="flex flex-col gap-3">
          {sessions.map((session) => (
            <SessionSummaryRow key={session.id} patientId={patientId} session={session} />
          ))}
        </ul>
      )}
    </div>
  )
}
