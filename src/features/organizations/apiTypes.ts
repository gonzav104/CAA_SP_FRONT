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
