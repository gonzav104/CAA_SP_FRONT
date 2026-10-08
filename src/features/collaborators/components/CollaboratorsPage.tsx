import { useState } from 'react'
import { Plus, Users } from 'lucide-react'
import { Navigate, useParams, useSearchParams } from 'react-router'
import { paths } from '@/app/paths'
import { getCollaboratorLinkErrorMessage, getCollaboratorWriteErrorMessage, getReadErrorMessage } from '@/api/errors'
import { ErrorState } from '@/components/ErrorState'
import { LoadingState } from '@/components/LoadingState'
import { Button } from '@/components/ui/button'
import type { PermisoColaborador } from '../apiTypes'
import { useCollaborators, useLinkCollaborator, useRevokeCollaborator, useUpdateCollaboratorPermission } from '../hooks'
import { CollaboratorRow } from './CollaboratorRow'
import { LinkCollaboratorForm } from './LinkCollaboratorForm'

/** Familia tab of the patient workspace. Only reachable in nav for the responsible therapist. */
export function CollaboratorsPage() {
  const { pacienteId } = useParams()
  if (!pacienteId) return <Navigate to={paths.patients()} replace />
  return <CollaboratorsPageContent patientId={pacienteId} />
}

function CollaboratorsPageContent({ patientId }: { patientId: string }) {
  const { data: collaborators, isPending, isError, error, refetch } = useCollaborators(patientId)
  const linkCollaborator = useLinkCollaborator(patientId)
  const updatePermission = useUpdateCollaboratorPermission(patientId)
  const revokeCollaborator = useRevokeCollaborator(patientId)

  const [searchParams] = useSearchParams()
  // A workspace-nav shortcut ("Vincular familiar") can land here with the form already open.
  const [isLinking, setIsLinking] = useState(() => searchParams.get('crear') === '1')
  const [linkError, setLinkError] = useState<string | null>(null)
  const [revokeTargetId, setRevokeTargetId] = useState<string | null>(null)
  const [revokeError, setRevokeError] = useState<string | null>(null)
  const [permissionErrorTargetId, setPermissionErrorTargetId] = useState<string | null>(null)
  const [permissionError, setPermissionError] = useState<string | null>(null)

  const handleLink = async (values: { email: string; permiso: PermisoColaborador }) => {
    setLinkError(null)
    try {
      await linkCollaborator.mutateAsync(values)
      setIsLinking(false)
    } catch (err) {
      setLinkError(getCollaboratorLinkErrorMessage(err))
    }
  }

  const handleChangePermission = async (userId: string, permiso: PermisoColaborador) => {
    setPermissionErrorTargetId(null)
    setPermissionError(null)
    try {
      await updatePermission.mutateAsync({ userId, request: { permiso } })
    } catch (err) {
      setPermissionErrorTargetId(userId)
      setPermissionError(getCollaboratorWriteErrorMessage(err))
    }
  }

  const handleRevoke = async (userId: string) => {
    setRevokeError(null)
    try {
      await revokeCollaborator.mutateAsync(userId)
      setRevokeTargetId(null)
    } catch (err) {
      setRevokeError(getCollaboratorWriteErrorMessage(err))
    }
  }

  if (isPending) return <LoadingState message="Cargando familiares…" />
  if (isError) {
    return (
      <ErrorState
        message={getReadErrorMessage(error, 'No encontramos familiares para este paciente o no tienes acceso.')}
        onRetry={() => void refetch()}
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-foreground">Familia</h2>
        {!isLinking && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => {
              setLinkError(null)
              setIsLinking(true)
            }}
          >
            <Plus aria-hidden="true" />
            Vincular familiar
          </Button>
        )}
      </div>

      {isLinking && (
        <LinkCollaboratorForm
          isPending={linkCollaborator.isPending}
          error={linkError}
          onSubmit={(values) => void handleLink(values)}
          onCancel={() => {
            setIsLinking(false)
            setLinkError(null)
          }}
        />
      )}

      {collaborators.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-background px-6 py-10 text-center">
          <Users aria-hidden="true" className="size-6 text-muted-foreground" />
          <p className="text-muted-foreground">Todavía no hay familiares vinculados a este paciente.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {collaborators.map((collaborator) => (
            <CollaboratorRow
              key={collaborator.userId}
              collaborator={collaborator}
              isPermissionPending={updatePermission.isPending && updatePermission.variables?.userId === collaborator.userId}
              permissionError={permissionErrorTargetId === collaborator.userId ? permissionError : null}
              isRevokePending={revokeCollaborator.isPending && revokeTargetId === collaborator.userId}
              revokeError={revokeTargetId === collaborator.userId ? revokeError : null}
              onChangePermission={(permiso) => void handleChangePermission(collaborator.userId, permiso)}
              onConfirmRevoke={() => {
                setRevokeTargetId(collaborator.userId)
                void handleRevoke(collaborator.userId)
              }}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
