import { useState } from 'react'
import { Plus, ShieldOff } from 'lucide-react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { paths } from '@/app/paths'
import {
  getInvitationRevokeErrorMessage,
  getMemberWriteErrorMessage,
  getOrganizationInviteErrorMessage,
  getReadErrorMessage,
} from '@/api/errors'
import { EmptyPanel } from '@/components/EmptyPanel'
import { ErrorState } from '@/components/ErrorState'
import { RowsSkeleton } from '@/components/RowsSkeleton'
import { Button, buttonVariants } from '@/components/ui/button'
import { useCurrentUser } from '@/features/auth/hooks'
import { InvitationRow } from '@/features/collaborators/components/InvitationRow'
import { ListNotice } from '@/features/boards/components/ListNotice'
import { BRAND_SECTION_TITLE_CLASS, BRAND_TITLE_CLASS } from '@/layouts/brand'
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
        <RowsSkeleton message="Cargando espacio…" rows={3} />
      </PageLayout>
    )
  }
  if (organizations.isError) {
    return (
      <PageLayout title="Miembros" backLink={{ to: paths.dashboard(), label: 'Volver al inicio' }}>
        <ErrorState
          message={getReadErrorMessage(organizations.error, 'No se pudieron cargar tus espacios.')}
          onRetry={() => void organizations.refetch()}
        />
      </PageLayout>
    )
  }
  // Only a current membership opens this page; an old link of a lost membership never does.
  const organization = organizations.data?.find((org) => org.id === organizacionId)
  if (!organization) {
    return (
      <PageLayout title="Miembros" backLink={{ to: paths.dashboard(), label: 'Volver al inicio' }}>
        <div role="status">
          <EmptyPanel
            icon={ShieldOff}
            action={
              <Link to={paths.dashboard()} className={buttonVariants({ size: 'lg' })}>
                Volver al inicio
              </Link>
            }
          >
            No tenés acceso a este espacio.
          </EmptyPanel>
        </div>
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
      backLink={{ to: paths.patientsInSpace(organizationId), label: 'Volver a los pacientes del espacio' }}
    >
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className={BRAND_TITLE_CLASS}>{organization.nombre}</h1>
          <p className="text-muted-foreground">Miembros y permisos del espacio.</p>
        </div>
        {canInvite && !isInviting && (
          <Button
            type="button"
            size="lg"
            className="h-10 w-full sm:w-auto"
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
      </header>

      <div className="flex flex-col gap-3">
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

        <h2 className={BRAND_SECTION_TITLE_CLASS}>Miembros</h2>
        {members.isPending && <RowsSkeleton message="Cargando miembros…" rows={3} />}
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

        {canInvite && !invitations.isPending && !invitations.isError && pending.length === 0 && (
          <section className="flex flex-col gap-1 pt-3">
            <h2 className={BRAND_SECTION_TITLE_CLASS}>Invitaciones pendientes</h2>
            <p className="text-sm text-muted-foreground">No hay invitaciones pendientes.</p>
          </section>
        )}

        {pending.length > 0 && (
          <section className="flex flex-col gap-3 pt-3">
            <h2 id="organization-invitations-title" className={BRAND_SECTION_TITLE_CLASS}>
              Invitaciones pendientes
            </h2>
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

      </div>
    </PageLayout>
  )
}
