import type { ColaboradorResponse, InvitacionResponse } from './apiTypes'
import type { Collaborator, FamilyInvitation } from './types'

export function toCollaborator(dto: ColaboradorResponse): Collaborator {
  return {
    userId: dto.usuarioId,
    name: dto.nombre,
    email: dto.email,
    permission: dto.permiso,
    linkedAt: dto.vinculadoEn,
  }
}

/** Sorted by name. */
export function toCollaborators(dtos: ColaboradorResponse[]): Collaborator[] {
  return dtos.map(toCollaborator).sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

/** Family invitations sorted by email. A missing proposed permission falls back to the most restrictive one. */
export function toFamilyInvitations(dtos: InvitacionResponse[]): FamilyInvitation[] {
  return dtos
    .filter((dto) => dto.tipo === 'PACIENTE_FAMILIAR')
    .map((dto) => ({
      id: dto.id,
      email: dto.email,
      permission: dto.permisoPropuesto ?? 'LECTURA',
      status: dto.estado,
      expiresAt: dto.expiraEn,
    }))
    .sort((a, b) => a.email.localeCompare(b.email, 'es'))
}

/** The backend only lists PENDIENTE invitations, but one can still be past its expiration date. */
export function isInvitationExpired(invitation: FamilyInvitation, now: Date = new Date()): boolean {
  if (invitation.status === 'EXPIRADA') return true
  return invitation.expiresAt !== null && new Date(invitation.expiresAt) <= now
}
