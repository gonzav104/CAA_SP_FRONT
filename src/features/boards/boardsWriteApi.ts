import { api } from '@/api/client'
import type { CartillaActualizacionRequest, CartillaRegistroRequest, CartillaResponse } from './apiTypes'

function boardsPath(patientId: string): string {
  return `/api/pacientes/${encodeURIComponent(patientId)}/cartillas`
}

function boardPath(patientId: string, boardId: string): string {
  return `${boardsPath(patientId)}/${encodeURIComponent(boardId)}`
}

/** Creates one cartilla (POST). Send only `nombre`: the backend defaults `esPrincipal` and `paradigma`. */
export async function createBoard(
  patientId: string,
  request: Pick<CartillaRegistroRequest, 'nombre'>,
): Promise<CartillaResponse> {
  const response = await api.post<CartillaResponse>(boardsPath(patientId), request)
  return response.data
}

/** Renames one cartilla (PUT). Creator-only. `esPrincipal` and `paradigma` are omitted, so the backend keeps them. */
export async function renameBoard(
  patientId: string,
  boardId: string,
  request: Pick<CartillaActualizacionRequest, 'nombre'>,
): Promise<CartillaResponse> {
  const response = await api.put<CartillaResponse>(boardPath(patientId, boardId), request)
  return response.data
}

/**
 * Marks one cartilla as the patient's principal (PUT, no body). Responsible therapist only; the backend
 * unmarks the previous principal in the same transaction.
 */
export async function setPrimaryBoard(patientId: string, boardId: string): Promise<CartillaResponse> {
  const response = await api.put<CartillaResponse>(`${boardPath(patientId, boardId)}/principal`)
  return response.data
}

/** Deletes one cartilla (DELETE, 204). Creator-only. The backend deletes its categories and items in cascade. */
export async function deleteBoard(patientId: string, boardId: string): Promise<void> {
  await api.delete(boardPath(patientId, boardId))
}
