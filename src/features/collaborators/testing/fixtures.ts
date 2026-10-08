import type { ColaboradorResponse } from '../apiTypes'

export const PATIENT_ID = 'p-3'

export const collaboratorsListResponse: ColaboradorResponse[] = [
  {
    usuarioId: 'u-rosa',
    nombre: 'Rosa Gómez',
    email: 'rosa@example.com',
    permiso: 'LECTURA',
    vinculadoEn: '2026-01-05T09:00:00',
  },
  {
    usuarioId: 'u-leo',
    nombre: 'Leo Gómez',
    email: 'leo@example.com',
    permiso: 'EDICION_LIMITADA',
    vinculadoEn: '2026-01-06T09:00:00',
  },
]
