import type { MiembroResponse, OrganizacionResponse, RolGestionAsignable } from './apiTypes'

// UX hints only: they hide actions the backend (OrganizacionServiceImpl / InvitacionServiceImpl) would
// refuse anyway, from the role it already reports. The backend still validates every call.

const isManager = (organization: OrganizacionResponse) =>
  organization.miRolGestion === 'OWNER' || organization.miRolGestion === 'ADMIN'

/** Inviting and listing pending invitations: OWNER or ADMIN. */
export const canInviteMembers = isManager

/** OWNER may propose ADMIN or MIEMBRO; ADMIN only MIEMBRO. OWNER is never proposable. */
export function invitableRoles(organization: OrganizacionResponse): RolGestionAsignable[] {
  if (organization.miRolGestion === 'OWNER') return ['MIEMBRO', 'ADMIN']
  if (organization.miRolGestion === 'ADMIN') return ['MIEMBRO']
  return []
}

/** Only the OWNER changes management roles, and never the OWNER's own. */
export function canChangeRole(organization: OrganizacionResponse, member: MiembroResponse): boolean {
  return organization.miRolGestion === 'OWNER' && member.rolGestion !== 'OWNER'
}

/** OWNER or ADMIN; an ADMIN cannot touch the OWNER's clinical capacity. */
export function canChangeTherapist(organization: OrganizacionResponse, member: MiembroResponse): boolean {
  if (organization.miRolGestion === 'OWNER') return true
  return organization.miRolGestion === 'ADMIN' && member.rolGestion !== 'OWNER'
}

/** The OWNER can never leave nor be removed; ADMIN removes MIEMBRO only; anyone else may leave. */
export function canRemoveMember(organization: OrganizacionResponse, member: MiembroResponse, selfId: string): boolean {
  if (member.rolGestion === 'OWNER') return false
  if (member.usuarioId === selfId) return true
  if (organization.miRolGestion === 'OWNER') return true
  return organization.miRolGestion === 'ADMIN' && member.rolGestion === 'MIEMBRO'
}
