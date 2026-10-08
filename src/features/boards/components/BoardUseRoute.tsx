import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { paths } from '@/app/paths'
import { getReadErrorMessage } from '@/api/errors'
import { FullScreenStatus } from '@/components/FullScreenStatus'
import { Button, buttonVariants } from '@/components/ui/button'
import { useCurrentUser } from '@/features/auth/hooks'
import { CommunicationPage } from '@/features/communication/components/CommunicationPage'
import { usePatient } from '@/features/patients/hooks'
import { useBoardDetail } from '../hooks'
import { canEditBoard } from '../permissions'
import { toCommunicationCategories } from '../toCommunicationCategories'

export function BoardUseRoute() {
  const { pacienteId, cartillaId } = useParams()
  if (!pacienteId || !cartillaId) return <Navigate to={paths.patients()} replace />
  return <BoardUseRouteContent patientId={pacienteId} boardId={cartillaId} />
}

function BoardUseRouteContent({ patientId, boardId }: { patientId: string; boardId: string }) {
  const navigate = useNavigate()
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

  const exitTo = canEditBoard(user, board.data.creatorId)
    ? paths.boardEditor(patientId, boardId)
    : paths.boards(patientId)

  return (
    // `key`: a different cartilla (or the same route after a refresh) always starts on its own
    // first category — never carries over an `activeCategoryId` that belonged to another board.
    <CommunicationPage
      key={board.data.id}
      userName={patient.data.firstName}
      categories={toCommunicationCategories(board.data)}
      onExit={() => navigate(exitTo)}
    />
  )
}
