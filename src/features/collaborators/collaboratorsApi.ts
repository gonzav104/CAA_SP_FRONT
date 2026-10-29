import { api } from '@/api/client'
import type {
  ColaboradorActualizacionRequest,
  ColaboradorRegistroRequest,
  ColaboradorResponse,
  InvitacionResponse,
} from './apiTypes'

function basePath(patientId: string): string {
  return `/api/pacientes/${encodeURIComponent(patientId)}/colaboradores`
}

function invitationsPath(patientId: string): string {
  return `/api/pacientes/${encodeURIComponent(patientId)}/invitaciones`
}

export async function fetchCollaborators(patientId: string): Promise<ColaboradorResponse[]> {
  const response = await api.get<ColaboradorResponse[]>(basePath(patientId))
  return response.data
}

// 202 Accepted: creates (or renews, for the same email) a family invitation; nothing is granted until
// it is accepted, and the invited email may not have an account yet. Repeating it resends the invitation.
export async function inviteCollaborator(
  patientId: string,
  request: ColaboradorRegistroRequest,
): Promise<InvitacionResponse> {
  const response = await api.post<InvitacionResponse>(basePath(patientId), request)
  return response.data
}

export async function updateCollaboratorPermission(
  patientId: string,
  userId: string,
  request: ColaboradorActualizacionRequest,
): Promise<ColaboradorResponse> {
  const response = await api.put<ColaboradorResponse>(
    `${basePath(patientId)}/${encodeURIComponent(userId)}`,
    request,
  )
  return response.data
}

export async function revokeCollaborator(patientId: string, userId: string): Promise<void> {
  await api.delete(`${basePath(patientId)}/${encodeURIComponent(userId)}`)
}

/** Pending family invitations of the patient (the backend lists only PENDIENTE ones). */
export async function fetchFamilyInvitations(patientId: string): Promise<InvitacionResponse[]> {
  const response = await api.get<InvitacionResponse[]>(invitationsPath(patientId))
  return response.data
}

/** Idempotent: revoking an already resolved invitation is a no-op (204). */
export async function revokeFamilyInvitation(patientId: string, invitationId: string): Promise<void> {
  await api.delete(`${invitationsPath(patientId)}/${encodeURIComponent(invitationId)}`)
}
