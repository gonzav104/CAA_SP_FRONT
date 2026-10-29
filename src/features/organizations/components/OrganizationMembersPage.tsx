import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { paths } from '@/app/paths'
import {
  getInvitationRevokeErrorMessage,
  getMemberWriteErrorMessage,
  getOrganizationInviteErrorMessage,
  getReadErrorMessage,
} from '@/api/errors'
import { ErrorState } from '@/components/ErrorState'
import { LoadingState } from '@/components/LoadingState'
import { Button, buttonVariants } from '@/components/ui/button'
import { useCurrentUser } from '@/features/auth/hooks'
import { InvitationRow } from '@/features/collaborators/components/InvitationRow'
import { ListNotice } from '@/features/boards/components/ListNotice'
import { PageLayout } from '@/layouts/PageLayout'
import type { InvitacionOrganizacionRequest, OrganizacionResponse, RolGestionAsignable } from '../apiTypes'
import {
  useChangeMemberRole,
  useChangeMemberTherapist,
  useInviteToOrganization,
  useMembers,
  useOrganizationInvitations,
  useOrganizations,
  useRemoveMember,
  useRevokeOrganizationInvitation,
} from '../hooks'
import { canChangeRole, canChangeTherapist, canInviteMembers, canRemoveMember, invitableRoles } from '../management'
import { ROL_GESTION_LABELS } from '../spaces'
import { InviteMemberForm } from './InviteMemberForm'
import { MemberRow } from './MemberRow'

/** Members and pending invitations of one workspace, reached from "Tus espacios" or its patients. */
export function OrganizationMembersPage() {
  const { organizacionId } = useParams()
  const organizations = useOrganizations()
  if (!organizacionId) return <Navigate to={paths.dashboard()} replace />

  if (organizations.isPending) {
    return (
      <PageLayout title="Miembros" backLink={{ to: paths.dashboard(), label: 'Volver al inicio' }}>
        <LoadingState message="Cargando espacio…" />
      </PageLayout>
    )
  }
  // Only a current membership opens this page; an old link of a lost membership never does.
  const organization = organizations.data?.find((org) => org.id === organizacionId)
  if (!organization) {
    return (
      <PageLayout title="Miembros" backLink={{ to: paths.dashboard(), label: 'Volver al inicio' }}>
        <p role="status" className="rounded-2xl border border-border/60 bg-background px-6 py-10 text-center text-muted-foreground">
          No tenés acceso a este espacio.
        </p>
      </PageLayout>
    )
  }
  return <MembersContent key={organization.id} organization={organization} />
}

function MembersContent({ organization }: { organization: OrganizacionResponse }) {
  const navigate = useNavigate()
  const { data: user } = useCurrentUser()
  const organizationId = organization.id
  const canInvite = canInviteMembers(organization)

  const members = useMembers(organizationId)
  const invitations = useOrganizationInvitations(organizationId, canInvite)
  const changeRole = useChangeMemberRole(organizationId)
  const changeTherapist = useChangeMemberTherapist(organizationId)
  const removeMember = useRemoveMember(organizationId)
  const invite = useInviteToOrganization(organizationId)
  const revokeInvitation = useRevokeOrganizationInvitation(organizationId)

  const [isInviting, setIsInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [memberError, setMemberError] = useState<{ userId: string; message: string } | null>(null)
  const [invitationError, setInvitationError] = useState<{ id: string; message: string } | null>(null)

  const memberPending = changeRole.isPending || changeTherapist.isPending || removeMember.isPending
  const invitationPending = invite.isPending || revokeInvitation.isPending

  const runMemberChange = async (userId: string, action: () => Promise<unknown>) => {
    setMemberError(null)
    setNotice(null)
    try {
      await action()
    } catch (err) {
      setMemberError({ userId, message: getMemberWriteErrorMessage(err) })
    }
  }

  const handleRemove = (userId: string, isSelf: boolean) =>
    void runMemberChange(userId, async () => {
      await removeMember.mutateAsync(userId)
      if (isSelf) navigate(paths.dashboard(), { replace: true })
    })

  const handleInvite = async (request: InvitacionOrganizacionRequest) => {
    setInviteError(null)
    setNotice(null)
    try {
      await invite.mutateAsync(request)
      setIsInviting(false)
      setNotice(`Invitación enviada a ${request.email}. Será miembro cuando la acepte.`)
    } catch (err) {
      setInviteError(getOrganizationInviteErrorMessage(err))
    }
  }

  // Resending repeats the POST with what the pending invitation proposes; the backend renews it.
  const handleResend = async (invitationId: string, request: InvitacionOrganizacionRequest) => {
    setInvitationError(null)
    setNotice(null)
    try {
      await invite.mutateAsync(request)
      setNotice(`Invitación reenviada a ${request.email}.`)
    } catch (err) {
      setInvitationError({ id: invitationId, message: getOrganizationInviteErrorMessage(err) })
    }
  }

  const handleRevoke = async (invitationId: string) => {
    setInvitationError(null)
    setNotice(null)
    try {
      await revokeInvitation.mutateAsync(invitationId)
    } catch (err) {
      setInvitationError({ id: invitationId, message: getInvitationRevokeErrorMessage(err) })
    }
  }

  const pending = (invitations.data ?? []).filter((invitation) => invitation.tipo === 'ORGANIZACION')

  return (
    <PageLayout
      title={organization.nombre}
      description="Miembros y permisos del espacio."
      backLink={{ to: paths.patientsInSpace(organizationId), label: 'Volver a los pacientes del espacio' }}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-foreground">Miembros</h2>
          {canInvite && !isInviting && (
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
              Invitar
            </Button>
          )}
        </div>

        {notice && <ListNotice notice={{ tone: 'success', message: notice }} onRetry={() => undefined} />}

        {isInviting && (
          <InviteMemberForm
            roles={invitableRoles(organization)}
            isPending={invite.isPending}
            error={inviteError}
            onSubmit={(request) => void handleInvite(request)}
            onCancel={() => {
              setIsInviting(false)
              setInviteError(null)
            }}
          />
        )}

        {members.isPending && <LoadingState message="Cargando miembros…" />}
        {members.isError && (
          <ErrorState
            message={getReadErrorMessage(members.error, 'El espacio ya no existe o no tenés acceso a él.')}
            onRetry={() => void members.refetch()}
          />
        )}
        {members.data && (
          <ul aria-label="Miembros del espacio" className="flex flex-col gap-3">
            {members.data.map((member) => {
              const isSelf = member.usuarioId === user?.id
              return (
                <MemberRow
                  key={member.usuarioId}
                  member={member}
                  isSelf={isSelf}
                  canChangeRole={canChangeRole(organization, member)}
                  canChangeTherapist={canChangeTherapist(organization, member)}
                  canRemove={!!user && canRemoveMember(organization, member, user.id)}
                  isPending={memberPending}
                  error={memberError?.userId === member.usuarioId ? memberError.message : null}
                  onChangeRole={(rolGestion: RolGestionAsignable) =>
                    void runMemberChange(member.usuarioId, () =>
                      changeRole.mutateAsync({ userId: member.usuarioId, rolGestion }),
                    )
                  }
                  onChangeTherapist={(esTerapeuta) =>
                    void runMemberChange(member.usuarioId, () =>
                      changeTherapist.mutateAsync({ userId: member.usuarioId, esTerapeuta }),
                    )
                  }
                  onRemove={() => handleRemove(member.usuarioId, isSelf)}
                />
              )
            })}
          </ul>
        )}

        {canInvite && invitations.isError && (
          <ListNotice
            notice={{ tone: 'error', message: 'No se pudieron cargar las invitaciones pendientes.', retry: true }}
            onRetry={() => void invitations.refetch()}
          />
        )}

        {pending.length > 0 && (
          <section className="flex flex-col gap-3 pt-2">
            <h3 id="organization-invitations-title" className="font-medium text-foreground">
              Invitaciones pendientes
            </h3>
            <ul aria-labelledby="organization-invitations-title" className="flex flex-col gap-3">
              {pending.map((invitation) => {
                const rolGestion: RolGestionAsignable = invitation.rolGestionPropuesto === 'ADMIN' ? 'ADMIN' : 'MIEMBRO'
                const esTerapeuta = invitation.esTerapeutaPropuesto === true
                return (
                  <InvitationRow
                    key={invitation.id}
                    invitation={{
                      id: invitation.id,
                      email: invitation.email,
                      status: invitation.estado,
                      expiresAt: invitation.expiraEn,
                    }}
                    description={`Invitación pendiente · ${ROL_GESTION_LABELS[rolGestion]}${esTerapeuta ? ' · Terapeuta' : ''}`}
                    actionsDisabled={invitationPending}
                    error={invitationError?.id === invitation.id ? invitationError.message : null}
                    onResend={() => void handleResend(invitation.id, { email: invitation.email, rolGestion, esTerapeuta })}
                    onRevoke={() => void handleRevoke(invitation.id)}
                  />
                )
              })}
            </ul>
          </section>
        )}

        <Link to={paths.patientsInSpace(organizationId)} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          Ver los pacientes del espacio
        </Link>
      </div>
    </PageLayout>
  )
}
