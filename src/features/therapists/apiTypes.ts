// Mirrors TerapeutaAsignadoResponseDTO: a clinical assignment (PacienteTerapeuta), not a membership.
export interface TerapeutaAsignadoResponse {
  usuarioId: string
  nombre: string
  email: string
  /** ISO local datetime. */
  asignadoEn: string
}
