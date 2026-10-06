import { api } from '@/api/client'
import type {
  CategoriaActualizacionRequest,
  CategoriaRegistroRequest,
  CategoriaResponse,
} from './apiTypes'

export interface BoardTarget {
  patientId: string
  boardId: string
}

export interface CategoryTarget extends BoardTarget {
  categoryId: string
}

function categoriesPath({ patientId, boardId }: BoardTarget): string {
  return `/api/pacientes/${encodeURIComponent(patientId)}/cartillas/${encodeURIComponent(boardId)}/categorias`
}

function categoryPath(target: CategoryTarget): string {
  return `${categoriesPath(target)}/${encodeURIComponent(target.categoryId)}`
}

/** Creates one category (POST). Omit `orden`: the backend appends it after the last one. */
export async function createCategory(
  target: BoardTarget,
  request: CategoriaRegistroRequest,
): Promise<CategoriaResponse> {
  const response = await api.post<CategoriaResponse>(categoriesPath(target), request)
  return response.data
}

/** Updates one category (PUT). `nombre` and `colorHex` are always replaced. */
export async function updateCategory(
  target: CategoryTarget,
  request: CategoriaActualizacionRequest,
): Promise<CategoriaResponse> {
  const response = await api.put<CategoriaResponse>(categoryPath(target), request)
  return response.data
}

/**
 * Deletes one category (DELETE, 204). The backend deletes ALL its items in cascade, irreversibly,
 * and does not renumber the remaining categories.
 */
export async function deleteCategory(target: CategoryTarget): Promise<void> {
  await api.delete(categoryPath(target))
}
