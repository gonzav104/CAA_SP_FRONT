import { api } from '@/api/client'
import type { MaterializarPictogramaRequest, PictogramaGlobalResponse } from './apiTypes'

/** The whole global pictogram library (unpaginated, no ordering guarantee). Read-only. */
export async function fetchGlobalPictograms(): Promise<PictogramaGlobalResponse[]> {
  const response = await api.get<PictogramaGlobalResponse[]>('/api/pictogramas-globales')
  return response.data
}

/**
 * Registers an ARASAAC library pictogram in the backend (idempotent: 201 created, 200 already
 * existed). Only the save mutation may call it, never the picker or a render.
 */
export async function materializePictogram(
  request: MaterializarPictogramaRequest,
): Promise<PictogramaGlobalResponse> {
  const response = await api.post<PictogramaGlobalResponse>('/api/pictogramas-globales/materializar', request)
  return response.data
}
