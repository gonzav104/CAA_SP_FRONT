export type PermisoColaborador = 'LECTURA' | 'EDICION_LIMITADA'

// Mirrors ColaboradorResponseDTO.
export interface ColaboradorResponse {
  usuarioId: string
  nombre: string
  email: string
  permiso: PermisoColaborador
  /** ISO local datetime. */
  vinculadoEn: string
}

// Mirrors ColaboradorRegistroDTO.
export interface ColaboradorRegistroRequest {
  email: string
  permiso: PermisoColaborador
}

export type TipoInvitacion = 'ORGANIZACION' | 'PACIENTE_FAMILIAR'
export type EstadoInvitacion = 'PENDIENTE' | 'ACEPTADA' | 'REVOCADA' | 'EXPIRADA'

// Mirrors InvitacionResponseDTO. Same shape whether the invited email has an account or not
// (no enumeration). Family invitations carry `permisoPropuesto`; the organization fields are null.
export interface InvitacionResponse {
  id: string
  tipo: TipoInvitacion
  email: string
  rolGestionPropuesto: string | null
  esTerapeutaPropuesto: boolean | null
  permisoPropuesto: PermisoColaborador | null
  estado: EstadoInvitacion
  /** ISO local datetime. */
  expiraEn: string | null
}

// Mirrors ColaboradorActualizacionDTO.
export interface ColaboradorActualizacionRequest {
  permiso: PermisoColaborador
}
