import type { SesionResponse } from './apiTypes'
import type { Session } from './types'

export function toSession(dto: SesionResponse): Session {
  return {
    id: dto.id,
    dateTime: dto.fechaHora,
    disposition: dto.disposicion,
    objectives: dto.objetivosTrabajados,
    notes: dto.observaciones,
    nextSteps: dto.estrategiasYProximosPasos,
    patientId: dto.pacienteId,
  }
}

/** Most recent first: the clinical history reads as a feed, newest session on top. */
export function toSessions(dtos: SesionResponse[]): Session[] {
  return dtos.map(toSession).sort((a, b) => b.dateTime.localeCompare(a.dateTime))
}
