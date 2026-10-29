import type { OrganizacionResponse } from '../apiTypes'

export const ownerOrganization: OrganizacionResponse = {
  id: 'org-1',
  nombre: 'Centro Sol',
  miRolGestion: 'OWNER',
  miEsTerapeuta: true,
}

export const therapistMemberOrganization: OrganizacionResponse = {
  ...ownerOrganization,
  miRolGestion: 'MIEMBRO',
  miEsTerapeuta: true,
}

export const adminOrganization: OrganizacionResponse = {
  id: 'org-2',
  nombre: 'Consultorio Luna',
  miRolGestion: 'ADMIN',
  miEsTerapeuta: false,
}

/** A member who is not a therapist: may belong to the organization, but not register patients. */
export const plainMemberOrganization: OrganizacionResponse = {
  id: 'org-3',
  nombre: 'Fundación Mar',
  miRolGestion: 'MIEMBRO',
  miEsTerapeuta: false,
}
