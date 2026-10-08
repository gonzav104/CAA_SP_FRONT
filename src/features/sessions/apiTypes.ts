// Mirrors SesionResponseDTO.
export interface SesionResponse {
  id: string
  /** ISO local datetime, `YYYY-MM-DDTHH:mm[:ss]`. */
  fechaHora: string
  disposicion: string | null
  objetivosTrabajados: string
  observaciones: string | null
  estrategiasYProximosPasos: string | null
  /** ISO local datetime. */
  creadoEn: string
  pacienteId: string
}

// Mirrors SesionRegistroDTO/SesionActualizacionDTO: both share the same real fields.
export interface SesionWriteRequest {
  /** ISO local datetime, `YYYY-MM-DDTHH:mm`. */
  fechaHora: string
  disposicion: string | null
  objetivosTrabajados: string
  observaciones: string | null
  estrategiasYProximosPasos: string | null
}
