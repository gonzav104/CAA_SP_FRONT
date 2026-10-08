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

// Mirrors ColaboradorActualizacionDTO.
export interface ColaboradorActualizacionRequest {
  permiso: PermisoColaborador
}
