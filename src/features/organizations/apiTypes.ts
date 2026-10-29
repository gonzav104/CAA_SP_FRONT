export type RolGestion = 'OWNER' | 'ADMIN' | 'MIEMBRO'

// Mirrors OrganizacionResponseDTO.
export interface OrganizacionResponse {
  id: string
  nombre: string
  miRolGestion: RolGestion
  miEsTerapeuta: boolean
}
