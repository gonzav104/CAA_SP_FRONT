import type { PictogramaCustomResponse } from '../apiTypes'

export const PATIENT_ID = 'p-3'

export const customPictogramsListResponse: PictogramaCustomResponse[] = [
  {
    id: 'pic-1',
    pacienteId: PATIENT_ID,
    etiqueta: 'Mochila',
    imagenUrl: 'https://cdn.example.com/mochila.png',
    creadoEn: '2026-01-05T09:00:00',
  },
  {
    id: 'pic-2',
    pacienteId: PATIENT_ID,
    etiqueta: 'Abrigo',
    imagenUrl: 'https://cdn.example.com/abrigo.png',
    creadoEn: '2026-01-06T09:00:00',
  },
]
