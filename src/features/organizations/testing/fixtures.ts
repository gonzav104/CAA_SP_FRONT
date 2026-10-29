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
