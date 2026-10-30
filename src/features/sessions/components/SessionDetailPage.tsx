import { useState } from 'react'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { paths } from '@/app/paths'
import { getReadErrorMessage, getSessionDeleteErrorMessage } from '@/api/errors'
import { ErrorState } from '@/components/ErrorState'
import { RowsSkeleton } from '@/components/RowsSkeleton'
import { Button, buttonVariants } from '@/components/ui/button'
import { BRAND_ACTION_CLASS, BRAND_PANEL_CLASS } from '@/layouts/brand'
import { cn } from '@/lib/utils'
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
    <div className="flex max-w-2xl flex-col gap-2 border-t border-border pt-6">
      <h3 className="text-sm font-semibold text-muted-foreground">{label}</h3>
      <p className="leading-relaxed whitespace-pre-wrap text-foreground">{value}</p>
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

  if (isPending) return <RowsSkeleton message="Cargando sesión…" rows={1} />
  if (isError) {
    return (
      <ErrorState
        message={getReadErrorMessage(error, 'No encontramos esta sesión o no tenés acceso.')}
        onRetry={() => void refetch()}
      />
    )
  }

  const session: Session | undefined = sessions.find((s) => s.id === sessionId)
  if (!session) {
    return <ErrorState message="Esta sesión ya no existe o no tenés acceso." onRetry={() => void refetch()} />
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

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h2 className="font-display text-xl font-bold tracking-[-0.01em] text-foreground tabular-nums sm:text-2xl">
              {formatSessionDateTime(session.dateTime)}
            </h2>
            {session.disposition && (
              <p className="text-sm text-muted-foreground">
                Disposición: <span className="font-medium text-foreground">{session.disposition}</span>
              </p>
            )}
          </div>
          <div className="flex w-full shrink-0 gap-2 sm:w-auto">
            <Link
              to={paths.sessionEdit(patientId, sessionId)}
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), BRAND_ACTION_CLASS)}
            >
              <Pencil aria-hidden="true" className="size-4" />
              Editar
            </Link>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className={cn(BRAND_ACTION_CLASS, 'text-destructive hover:bg-destructive/10 hover:text-destructive')}
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

      <div className={cn(BRAND_PANEL_CLASS, 'flex flex-col gap-6 p-5 sm:p-6')}>
        <LeadNoteBlock label="Objetivos trabajados" value={session.objectives} />
        <SecondaryNoteBlock label="Observaciones" value={session.notes} />
        <SecondaryNoteBlock label="Estrategias y próximos pasos" value={session.nextSteps} />
      </div>
    </div>
  )
}
