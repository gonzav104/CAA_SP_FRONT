export type PermisoColaborador = 'LECTURA' | 'EDICION_LIMITADA'

/** Effective capabilities of the current user over a patient (`LEER` is implicit and never sent). */
export type Capability = 'EDITAR_CONTENIDO' | 'GESTION_CLINICA' | 'ADMINISTRAR'

// Mirrors PacienteResponseDTO. `miPermiso` is the family link permission only (null for the clinical team);
// UI permissions come from `capacidades`.
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
  organizacionId: string
  capacidades: Capability[]
}

// Mirrors PacienteRegistroDTO. Backend requires nombre/apellido non-blank and fechaNacimiento in the past.
export interface PacienteRegistroRequest {
  nombre: string
  apellido: string
  /** ISO local date, `YYYY-MM-DD`. */
  fechaNacimiento: string
}

// Mirrors PacienteActualizacionDTO. Same required fields as registro, plus the optional grid size.
export interface PacienteActualizacionRequest {
  nombre: string
  apellido: string
  /** ISO local date, `YYYY-MM-DD`. */
  fechaNacimiento: string
  gridSize: number | null
}
