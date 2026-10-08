// Mirrors PictogramaCustomResponseDTO.
export interface PictogramaCustomResponse {
  id: string
  pacienteId: string
  etiqueta: string
  imagenUrl: string
  /** ISO local datetime. */
  creadoEn: string
}
