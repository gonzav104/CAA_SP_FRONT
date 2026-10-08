import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { paths } from '@/app/paths'
import { getReadErrorMessage, getSessionWriteErrorMessage } from '@/api/errors'
import { ErrorState } from '@/components/ErrorState'
import { LoadingState } from '@/components/LoadingState'
import { useSessions, useUpdateSession } from '../hooks'
import { toDateTimeInputValue } from '../format'
import { toWriteRequest } from '../sessionForm'
import type { SessionFormValues } from '../sessionForm'
import { SessionForm } from './SessionForm'

/** Edit page for one session: the same SessionForm, preloaded with its real data. */
export function EditSessionPage() {
  const { pacienteId, sesionId } = useParams()
  if (!pacienteId || !sesionId) return <Navigate to={paths.patients()} replace />
  return <EditSessionPageContent patientId={pacienteId} sessionId={sesionId} />
}

function EditSessionPageContent({ patientId, sessionId }: { patientId: string; sessionId: string }) {
  const navigate = useNavigate()
  const { data: sessions, isPending, isError, error, refetch } = useSessions(patientId)
  const updateSession = useUpdateSession(patientId)
  const [submitError, setSubmitError] = useState<string | null>(null)

  if (isPending) return <LoadingState message="Cargando sesión…" />
  if (isError) {
    return (
      <ErrorState
        message={getReadErrorMessage(error, 'No encontramos esta sesión o no tienes acceso.')}
        onRetry={() => void refetch()}
      />
    )
  }

  const session = sessions.find((s) => s.id === sessionId)
  if (!session) {
    return <ErrorState message="Esta sesión ya no existe o no tienes acceso." onRetry={() => void refetch()} />
  }

  const handleSubmit = async (values: SessionFormValues) => {
    setSubmitError(null)
    try {
      await updateSession.mutateAsync({ sessionId, request: toWriteRequest(values) })
      navigate(paths.sessionDetail(patientId, sessionId))
    } catch (err) {
      setSubmitError(getSessionWriteErrorMessage(err))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Link
        to={paths.sessionDetail(patientId, sessionId)}
        className="inline-flex min-h-10 w-fit items-center gap-1.5 rounded-md text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Volver a la sesión
      </Link>
      <SessionForm
        title="Editar sesión"
        submitLabel="Guardar cambios"
        pendingLabel="Guardando…"
        isPending={updateSession.isPending}
        error={submitError}
        onSubmit={(values) => void handleSubmit(values)}
        onCancel={() => navigate(paths.sessionDetail(patientId, sessionId))}
        defaultValues={{
          fechaHora: toDateTimeInputValue(session.dateTime),
          disposicion: session.disposition ?? '',
          objetivosTrabajados: session.objectives,
          observaciones: session.notes ?? '',
          estrategiasYProximosPasos: session.nextSteps ?? '',
        }}
      />
    </div>
  )
}
