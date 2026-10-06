import { api } from '@/api/client'
import type {
  ItemCartillaActualizacionRequest,
  ItemCartillaRegistroRequest,
  ItemCartillaResponse,
} from './apiTypes'

export interface BoardCategoryTarget {
  patientId: string
  boardId: string
  categoryId: string
}

export interface BoardItemTarget extends BoardCategoryTarget {
  itemId: string
}

function categoryItemsPath({ patientId, boardId, categoryId }: BoardCategoryTarget): string {
  return `/api/pacientes/${encodeURIComponent(patientId)}/cartillas/${encodeURIComponent(boardId)}/categorias/${encodeURIComponent(categoryId)}/items`
}

function itemPath(target: BoardItemTarget): string {
  return `${categoryItemsPath(target)}/${encodeURIComponent(target.itemId)}`
}

/** Creates one item at the end of its category (POST). Omit `ordenVisual`: the backend assigns it. */
export async function createBoardItem(
  target: BoardCategoryTarget,
  request: ItemCartillaRegistroRequest,
): Promise<ItemCartillaResponse> {
  const response = await api.post<ItemCartillaResponse>(categoryItemsPath(target), request)
  return response.data
}

/** Updates one existing item (PUT). */
export async function updateBoardItem(
  target: BoardItemTarget,
  request: ItemCartillaActualizacionRequest,
): Promise<ItemCartillaResponse> {
  const response = await api.put<ItemCartillaResponse>(itemPath(target), request)
  return response.data
}

/** Deletes one item (DELETE, 204). The backend does not renumber the remaining items. */
export async function deleteBoardItem(target: BoardItemTarget): Promise<void> {
  await api.delete(itemPath(target))
}
