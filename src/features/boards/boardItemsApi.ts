import { api } from '@/api/client'
import type { ItemCartillaActualizacionRequest, ItemCartillaResponse } from './apiTypes'

export interface BoardItemTarget {
  patientId: string
  boardId: string
  categoryId: string
  itemId: string
}

/** The only write endpoint the editor uses: updates one existing item (PUT). */
export async function updateBoardItem(
  target: BoardItemTarget,
  request: ItemCartillaActualizacionRequest,
): Promise<ItemCartillaResponse> {
  const { patientId, boardId, categoryId, itemId } = target
  const response = await api.put<ItemCartillaResponse>(
    `/api/pacientes/${encodeURIComponent(patientId)}/cartillas/${encodeURIComponent(boardId)}/categorias/${encodeURIComponent(categoryId)}/items/${encodeURIComponent(itemId)}`,
    request,
  )
  return response.data
}
