export type PermisoColaborador = 'LECTURA' | 'EDICION_LIMITADA'

// Mirrors PacienteResponseDTO. `miPermiso` is null for the owning therapist.
export interface PacienteResponse {
  id: string
  nombre: string
  apellido: string
  /** ISO local date, `YYYY-MM-DD`. */
  fechaNacimiento: string
  /** ISO local datetime. */
  creadoEn: string
  miPermiso: PermisoColaborador | null
  gridSize: number | null
}

// Mirrors PacienteRegistroDTO. Backend requires nombre/apellido non-blank and fechaNacimiento in the past.
export interface PacienteRegistroRequest {
  nombre: string
  apellido: string
  /** ISO local date, `YYYY-MM-DD`. */
  fechaNacimiento: string
}
