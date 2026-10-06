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

  const error = board.isError ? board.error : patient.isError ? patient.error : null
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
                if (board.isError) void board.refetch()
                if (patient.isError) void patient.refetch()
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
