export type RolGestion = 'OWNER' | 'ADMIN' | 'MIEMBRO'

// Mirrors OrganizacionResponseDTO.
export interface OrganizacionResponse {
  id: string
  nombre: string
  miRolGestion: RolGestion
  miEsTerapeuta: boolean
}

// Mirrors OrganizacionRegistroDTO. Only the name is sent: the backend makes the creator OWNER and, with
// `esTerapeuta` omitted, a therapist too. The frontend never proposes roles.
export interface OrganizacionRegistroRequest {
  nombre: string
}

// Mirrors MiembroResponseDTO.
export interface MiembroResponse {
  usuarioId: string
  nombre: string
  email: string
  rolGestion: RolGestion
  esTerapeuta: boolean
  /** ISO local datetime. */
  unidoEn: string
}

/** Roles an invitation or a role change may propose: OWNER is never accepted by the backend. */
export type RolGestionAsignable = Exclude<RolGestion, 'OWNER'>

// Mirrors InvitacionOrganizacionRegistroDTO: two independent fields, never a single "rol".
export interface InvitacionOrganizacionRequest {
  email: string
  rolGestion: RolGestionAsignable
  esTerapeuta: boolean
}
