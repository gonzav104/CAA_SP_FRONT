import { api } from '@/api/client'
import type { InvitacionResponse } from '@/features/collaborators/apiTypes'
import type { InvitacionOrganizacionRequest, MiembroResponse, RolGestionAsignable } from './apiTypes'

const organizationPath = (organizationId: string) => `/api/organizaciones/${encodeURIComponent(organizationId)}`
const memberPath = (organizationId: string, userId: string) =>
  `${organizationPath(organizationId)}/miembros/${encodeURIComponent(userId)}`

/** Any member may list the organization's members. */
export async function fetchMembers(organizationId: string): Promise<MiembroResponse[]> {
  const response = await api.get<MiembroResponse[]>(`${organizationPath(organizationId)}/miembros`)
  return response.data
}

/** OWNER only, never on the OWNER and never proposing OWNER (the backend rejects both). */
export async function changeMemberRole(
  organizationId: string,
  userId: string,
  rolGestion: RolGestionAsignable,
): Promise<MiembroResponse> {
  const response = await api.put<MiembroResponse>(`${memberPath(organizationId, userId)}/rol-gestion`, { rolGestion })
  return response.data
}

/** OWNER/ADMIN (ADMIN not on the OWNER). Turning it off also drops the member's patient assignments. */
export async function changeMemberTherapist(
  organizationId: string,
  userId: string,
  esTerapeuta: boolean,
): Promise<MiembroResponse> {
  const response = await api.put<MiembroResponse>(`${memberPath(organizationId, userId)}/terapeuta`, { esTerapeuta })
  return response.data
}

/** Removing someone else, or leaving when `userId` is the caller. The OWNER can do neither (409). */
export async function removeMember(organizationId: string, userId: string): Promise<void> {
  await api.delete(memberPath(organizationId, userId))
}

/** Pending organization invitations (OWNER/ADMIN). */
export async function fetchOrganizationInvitations(organizationId: string): Promise<InvitacionResponse[]> {
  const response = await api.get<InvitacionResponse[]>(`${organizationPath(organizationId)}/invitaciones`)
  return response.data
}

// 202 Accepted with the invitation; repeating it for the same e-mail renews (resends) it.
export async function inviteToOrganization(
  organizationId: string,
  request: InvitacionOrganizacionRequest,
): Promise<InvitacionResponse> {
  const response = await api.post<InvitacionResponse>(`${organizationPath(organizationId)}/invitaciones`, request)
  return response.data
}

/** Idempotent: an already resolved invitation is left as is (204). */
export async function revokeOrganizationInvitation(organizationId: string, invitationId: string): Promise<void> {
  await api.delete(`${organizationPath(organizationId)}/invitaciones/${encodeURIComponent(invitationId)}`)
}
