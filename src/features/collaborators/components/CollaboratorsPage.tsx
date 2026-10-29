import { useState } from 'react'
import { Plus, Users } from 'lucide-react'
import { Navigate, useParams, useSearchParams } from 'react-router'
import { paths } from '@/app/paths'
import {
  getCollaboratorInviteErrorMessage,
  getCollaboratorWriteErrorMessage,
  getInvitationRevokeErrorMessage,
  getReadErrorMessage,
} from '@/api/errors'
import { ErrorState } from '@/components/ErrorState'
import { LoadingState } from '@/components/LoadingState'
import { Button } from '@/components/ui/button'
import { ListNotice } from '@/features/boards/components/ListNotice'
import { usePatient } from '@/features/patients/hooks'
import { canAccessCollaborators } from '@/features/patients/permissions'
import type { ColaboradorRegistroRequest, PermisoColaborador } from '../apiTypes'
import {
  useCollaborators,
  useFamilyInvitations,
  useInviteCollaborator,
  useRevokeCollaborator,
  useRevokeFamilyInvitation,
  useUpdateCollaboratorPermission,
} from '../hooks'
import { CollaboratorRow } from './CollaboratorRow'
import { InvitationRow } from './InvitationRow'
import { LinkCollaboratorForm } from './LinkCollaboratorForm'

/** Familia tab of the patient workspace. Administering the family needs GESTION_CLINICA on the patient. */
export function CollaboratorsPage() {
  const { pacienteId } = useParams()
  if (!pacienteId) return <Navigate to={paths.patients()} replace />
  return <CollaboratorsPageContent patientId={pacienteId} />
}

function CollaboratorsPageContent({ patientId }: { patientId: string }) {
  // The workspace layout already loads the patient; this reads the same cache entry.
  const patient = usePatient(patientId)
  const canManage = canAccessCollaborators(patient.data)

  const { data: collaborators, isPending, isError, error, refetch } = useCollaborators(patientId, canManage)
  const invitations = useFamilyInvitations(patientId, canManage)
  const inviteCollaborator = useInviteCollaborator(patientId)
  const revokeInvitation = useRevokeFamilyInvitation(patientId)
  const updatePermission = useUpdateCollaboratorPermission(patientId)
  const revokeCollaborator = useRevokeCollaborator(patientId)

  const [searchParams] = useSearchParams()
  // A workspace-nav shortcut can land here with the form already open.
  const [isInviting, setIsInviting] = useState(() => searchParams.get('crear') === '1')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [invitationErrorTarget, setInvitationErrorTarget] = useState<{ id: string; message: string } | null>(null)
  const [revokeTargetId, setRevokeTargetId] = useState<string | null>(null)
  const [revokeError, setRevokeError] = useState<string | null>(null)
  const [permissionErrorTargetId, setPermissionErrorTargetId] = useState<string | null>(null)
  const [permissionError, setPermissionError] = useState<string | null>(null)

  const handleInvite = async (values: ColaboradorRegistroRequest) => {
    setInviteError(null)
    setNotice(null)
    try {
      await inviteCollaborator.mutateAsync(values)
      setIsInviting(false)
      setNotice(`Invitación enviada a ${values.email}. Tendrá acceso cuando la acepte.`)
    } catch (err) {
      setInviteError(getCollaboratorInviteErrorMessage(err))
    }
  }

  // Resending repeats the POST: the backend renews the same pending invitation and its expiration.
  const handleResend = async (invitationId: string, request: ColaboradorRegistroRequest) => {
    setInvitationErrorTarget(null)
    setNotice(null)
    try {
      await inviteCollaborator.mutateAsync(request)
      setNotice(`Invitación reenviada a ${request.email}.`)
    } catch (err) {
      setInvitationErrorTarget({ id: invitationId, message: getCollaboratorInviteErrorMessage(err) })
    }
  }

  const handleRevokeInvitation = async (invitationId: string) => {
    setInvitationErrorTarget(null)
    setNotice(null)
    try {
      await revokeInvitation.mutateAsync(invitationId)
    } catch (err) {
      setInvitationErrorTarget({ id: invitationId, message: getInvitationRevokeErrorMessage(err) })
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

  if (!patient.data) return <LoadingState message="Cargando familiares…" />
  if (!canManage) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-background px-6 py-10 text-center">
        <Users aria-hidden="true" className="size-6 text-muted-foreground" />
        <p className="text-muted-foreground">Solo el equipo clínico del paciente puede administrar a su familia.</p>
      </div>
    )
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

  const pendingInvitations = invitations.data ?? []
  const invitationActionsDisabled = inviteCollaborator.isPending || revokeInvitation.isPending

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-foreground">Familia</h2>
        {!isInviting && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => {
              setInviteError(null)
              setNotice(null)
              setIsInviting(true)
            }}
          >
            <Plus aria-hidden="true" />
            Invitar familiar
          </Button>
        )}
      </div>

      {notice && <ListNotice notice={{ tone: 'success', message: notice }} onRetry={() => undefined} />}

      {isInviting && (
        <LinkCollaboratorForm
          isPending={inviteCollaborator.isPending}
          error={inviteError}
          onSubmit={(values) => void handleInvite(values)}
          onCancel={() => {
            setIsInviting(false)
            setInviteError(null)
          }}
        />
      )}

      {collaborators.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-background px-6 py-10 text-center">
          <Users aria-hidden="true" className="size-6 text-muted-foreground" />
          <p className="text-muted-foreground">Todavía no hay familiares vinculados a este paciente.</p>
        </div>
      ) : (
        <ul aria-label="Familiares vinculados" className="flex flex-col gap-3">
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

      {invitations.isError && (
        <ListNotice
          notice={{ tone: 'error', message: 'No se pudieron cargar las invitaciones pendientes.', retry: true }}
          onRetry={() => void invitations.refetch()}
        />
      )}

      {pendingInvitations.length > 0 && (
        <section className="flex flex-col gap-3 pt-2">
          <h3 id="pending-invitations-title" className="font-medium text-foreground">
            Invitaciones pendientes
          </h3>
          <ul aria-labelledby="pending-invitations-title" className="flex flex-col gap-3">
            {pendingInvitations.map((invitation) => (
              <InvitationRow
                key={invitation.id}
                invitation={invitation}
                actionsDisabled={invitationActionsDisabled}
                error={invitationErrorTarget?.id === invitation.id ? invitationErrorTarget.message : null}
                onResend={() =>
                  void handleResend(invitation.id, { email: invitation.email, permiso: invitation.permission })
                }
                onRevoke={() => void handleRevokeInvitation(invitation.id)}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
