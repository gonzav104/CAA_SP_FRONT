import { Link, Navigate, useParams } from 'react-router'
import { paths } from '@/app/paths'
import { getReadErrorMessage } from '@/api/errors'
import { FullScreenStatus } from '@/components/FullScreenStatus'
import { Button, buttonVariants } from '@/components/ui/button'
import { useCurrentUser } from '@/features/auth/hooks'
import { usePatient } from '@/features/patients/hooks'
import { useBoardDetail } from '../hooks'
import { canEditBoard } from '../permissions'
import { BoardEditorPage } from './BoardEditorPage'
import { NoEditPermission } from './NoEditPermission'

export function BoardEditorRoute() {
  const { pacienteId, cartillaId } = useParams()
  if (!pacienteId || !cartillaId) return <Navigate to={paths.patients()} replace />
  return <BoardEditorRouteContent patientId={pacienteId} boardId={cartillaId} />
}

function BoardEditorRouteContent({ patientId, boardId }: { patientId: string; boardId: string }) {
  const patient = usePatient(patientId)
  const board = useBoardDetail(patientId, boardId)
  const { data: user } = useCurrentUser()

  // A failed background reload keeps the data it had: never replace a live editor (and its draft) with an error screen.
  const boardError = board.isError && !board.data ? board.error : null
  const patientError = patient.isError && !patient.data ? patient.error : null
  const error = boardError ?? patientError
  if (error) {
    return (
      <FullScreenStatus
        message={getReadErrorMessage(error, 'No encontramos la cartilla o no tienes acceso.')}
        action={
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                if (boardError) void board.refetch()
                if (patientError) void patient.refetch()
              }}
            >
              Reintentar
            </Button>
            <Link to={paths.boards(patientId)} className={buttonVariants({ variant: 'ghost', size: 'lg' })}>
              Volver a las cartillas
            </Link>
          </div>
        }
      />
    )
  }

  if (!patient.data || !board.data) return <FullScreenStatus message="Cargando cartilla…" />

  if (!canEditBoard(user, board.data.creatorId)) {
    return <NoEditPermission patientId={patientId} boardId={boardId} />
  }

  return <BoardEditorPage key={board.data.id} patient={patient.data} serverBoard={board.data} />
}
