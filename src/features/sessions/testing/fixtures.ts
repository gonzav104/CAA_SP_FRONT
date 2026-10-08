import type { SesionResponse } from '../apiTypes'

export const PATIENT_ID = 'p-3'

// Deliberately unsorted: the mapper must sort most-recent-first.
export const sessionsListResponse: SesionResponse[] = [
  {
    id: 's-1',
    fechaHora: '2026-01-10T10:00:00',
    disposicion: 'Colaborador',
    objetivosTrabajados: 'Pedir ayuda con pictogramas',
    observaciones: 'Buena respuesta inicial',
    estrategiasYProximosPasos: 'Reforzar la próxima semana',
    creadoEn: '2026-01-10T11:00:00',
    pacienteId: PATIENT_ID,
  },
  {
    id: 's-2',
    fechaHora: '2026-02-05T15:30:00',
    disposicion: null,
    objetivosTrabajados: 'Reconocer emociones básicas',
    observaciones: null,
    estrategiasYProximosPasos: null,
    creadoEn: '2026-02-05T16:00:00',
    pacienteId: PATIENT_ID,
  },
]
