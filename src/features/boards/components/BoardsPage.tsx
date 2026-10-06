import { Star } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router'
import { paths } from '@/app/paths'
import { getReadErrorMessage } from '@/api/errors'
import { ErrorState } from '@/components/ErrorState'
import { LoadingState } from '@/components/LoadingState'
import { buttonVariants } from '@/components/ui/button'
import { useCurrentUser } from '@/features/auth/hooks'
import { usePatient } from '@/features/patients/hooks'
import { PageLayout } from '@/layouts/PageLayout'
import { cn } from '@/lib/utils'
import { useBoards } from '../hooks'
import { canEditBoard } from '../permissions'
import type { BoardSummary } from '../types'

interface BoardRowProps {
  patientId: string
  board: BoardSummary
  canEdit: boolean
}

function BoardRow({ patientId, board, canEdit }: BoardRowProps) {
  return (
    <li
      className={cn(
        'flex min-h-16 flex-wrap items-center justify-between gap-3 rounded-xl border bg-background px-5 py-3',
        board.isPrimary && 'border-primary/60 shadow-sm',
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="truncate text-base font-medium">{board.name}</span>
        {board.isPrimary && (
          <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            <Star aria-hidden="true" className="size-3.5 fill-current" />
            Principal
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {!canEdit && <span className="text-sm text-muted-foreground">Solo lectura</span>}
        {canEdit && (
          <Link
            to={paths.boardEditor(patientId, board.id)}
            className={buttonVariants({ variant: 'outline', size: 'lg' })}
          >
            Editar
          </Link>
        )}
        <Link to={paths.boardUse(patientId, board.id)} className={buttonVariants({ size: 'lg' })}>
          Modo Uso
        </Link>
      </div>
    </li>
  )
}

function BoardsContent({ patientId }: { patientId: string }) {
  const { data: user } = useCurrentUser()
  const { data: boards, isPending, isError, error, refetch } = useBoards(patientId)

  if (isError) {
    return (
      <ErrorState
        message={getReadErrorMessage(error, 'No encontramos las cartillas o no tienes acceso.')}
        onRetry={() => void refetch()}
      />
    )
  }
  if (isPending) return <LoadingState message="Cargando cartillas…" />
  if (boards.length === 0) {
    return (
      <p className="rounded-xl border bg-background px-6 py-10 text-center text-muted-foreground">
        Este paciente todavía no tiene cartillas.
      </p>
    )
  }
  return (
    <ul className="flex flex-col gap-3">
      {boards.map((board) => (
        <BoardRow
          key={board.id}
          patientId={patientId}
          board={board}
          canEdit={canEditBoard(user, board.creatorId)}
        />
      ))}
    </ul>
  )
}

export function BoardsPage() {
  const { pacienteId } = useParams()
  if (!pacienteId) return <Navigate to={paths.patients()} replace />
  return <BoardsPageContent patientId={pacienteId} />
}

function BoardsPageContent({ patientId }: { patientId: string }) {
  const patient = usePatient(patientId)

  return (
    <PageLayout
      title={patient.data?.fullName ?? 'Cartillas'}
      backLink={{ to: paths.patients(), label: 'Pacientes' }}
    >
      {patient.isError && (
        <ErrorState
          message={getReadErrorMessage(patient.error, 'No encontramos al paciente o no tienes acceso.')}
          onRetry={() => void patient.refetch()}
        />
      )}
      {!patient.isError && <BoardsContent patientId={patientId} />}
    </PageLayout>
  )
}
