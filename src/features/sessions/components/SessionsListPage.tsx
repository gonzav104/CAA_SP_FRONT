import { Plus } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router'
import { paths } from '@/app/paths'
import { getReadErrorMessage } from '@/api/errors'
import { ErrorState } from '@/components/ErrorState'
import { LoadingState } from '@/components/LoadingState'
import { buttonVariants } from '@/components/ui/button'
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

  if (isPending) return <LoadingState message="Cargando sesiones…" />
  if (isError) {
    return (
      <ErrorState
        message={getReadErrorMessage(error, 'No encontramos sesiones para este paciente o no tienes acceso.')}
        onRetry={() => void refetch()}
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-foreground">Sesiones</h2>
        <Link to={paths.sessionNew(patientId)} className={buttonVariants({ variant: 'outline', size: 'lg' })}>
          <Plus aria-hidden="true" />
          Registrar sesión
        </Link>
      </div>

      {sessions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-background px-6 py-10 text-center">
          <p className="text-muted-foreground">Todavía no hay sesiones registradas.</p>
        </div>
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
