import { useState } from 'react'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { paths } from '@/app/paths'
import { getReadErrorMessage, getSessionDeleteErrorMessage } from '@/api/errors'
import { ErrorState } from '@/components/ErrorState'
import { LoadingState } from '@/components/LoadingState'
import { Button, buttonVariants } from '@/components/ui/button'
import { formatSessionDateTime } from '../format'
import { useDeleteSession, useSessions } from '../hooks'
import type { Session } from '../types'
import { DeleteSessionConfirmation } from './DeleteSessionConfirmation'

/** Objetivos is the one required field: it reads as the lead paragraph, not just another block. */
function LeadNoteBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex max-w-2xl flex-col gap-2">
      <h3 className="text-sm font-semibold text-foreground">{label}</h3>
      <p className="text-base leading-relaxed whitespace-pre-wrap text-foreground">{value}</p>
    </div>
  )
}

/** Observaciones and estrategias are real but optional, and read a step quieter than Objetivos. */
function SecondaryNoteBlock({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div className="flex max-w-2xl flex-col gap-2 border-t border-border/60 pt-6">
      <h3 className="text-sm font-semibold text-muted-foreground">{label}</h3>
      <p className="leading-relaxed whitespace-pre-wrap text-foreground/90">{value}</p>
    </div>
  )
}

/** Dedicated page for one session: every real field, plus Editar/Eliminar. */
export function SessionDetailPage() {
  const { pacienteId, sesionId } = useParams()
  if (!pacienteId || !sesionId) return <Navigate to={paths.patients()} replace />
  return <SessionDetailPageContent patientId={pacienteId} sessionId={sesionId} />
}

function SessionDetailPageContent({ patientId, sessionId }: { patientId: string; sessionId: string }) {
  const navigate = useNavigate()
  const { data: sessions, isPending, isError, error, refetch } = useSessions(patientId)
  const deleteSession = useDeleteSession(patientId)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  if (isPending) return <LoadingState message="Cargando sesión…" />
  if (isError) {
    return (
      <ErrorState
        message={getReadErrorMessage(error, 'No encontramos esta sesión o no tienes acceso.')}
        onRetry={() => void refetch()}
      />
    )
  }

  const session: Session | undefined = sessions.find((s) => s.id === sessionId)
  if (!session) {
    return <ErrorState message="Esta sesión ya no existe o no tienes acceso." onRetry={() => void refetch()} />
  }

  const handleDelete = async () => {
    setDeleteError(null)
    try {
      await deleteSession.mutateAsync(sessionId)
      navigate(paths.sessions(patientId))
    } catch (err) {
      setDeleteError(getSessionDeleteErrorMessage(err))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Link
        to={paths.sessions(patientId)}
        className="inline-flex min-h-10 w-fit items-center gap-1.5 rounded-md text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Volver a sesiones
      </Link>

      <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-background p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold text-foreground">{formatSessionDateTime(session.dateTime)}</h2>
            {session.disposition && (
              <span className="w-fit rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                {session.disposition}
              </span>
            )}
          </div>
          <div className="flex shrink-0 gap-2">
            <Link
              to={paths.sessionEdit(patientId, sessionId)}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              <Pencil aria-hidden="true" className="size-4" />
              Editar
            </Link>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                setDeleteError(null)
                setIsConfirmingDelete(true)
              }}
            >
              <Trash2 aria-hidden="true" className="size-4" />
              Eliminar
            </Button>
          </div>
        </div>

        {isConfirmingDelete && (
          <DeleteSessionConfirmation
            dateTimeLabel={formatSessionDateTime(session.dateTime)}
            isPending={deleteSession.isPending}
            error={deleteError}
            onConfirm={() => void handleDelete()}
            onCancel={() => setIsConfirmingDelete(false)}
          />
        )}
      </div>

      <div className="flex flex-col gap-6 rounded-2xl border border-border/60 bg-background p-6 sm:p-8">
        <LeadNoteBlock label="Objetivos trabajados" value={session.objectives} />
        <SecondaryNoteBlock label="Observaciones" value={session.notes} />
        <SecondaryNoteBlock label="Estrategias y próximos pasos" value={session.nextSteps} />
      </div>
    </div>
  )
}
