import { api } from '@/api/client'
import type { CartillaDetalleResponse, CartillaResponse } from './apiTypes'

export async function fetchBoards(patientId: string): Promise<CartillaResponse[]> {
  const response = await api.get<CartillaResponse[]>(
    `/api/pacientes/${encodeURIComponent(patientId)}/cartillas`,
  )
  return response.data
}

export async function fetchBoardDetail(
  patientId: string,
  boardId: string,
): Promise<CartillaDetalleResponse> {
  const response = await api.get<CartillaDetalleResponse>(
    `/api/pacientes/${encodeURIComponent(patientId)}/cartillas/${encodeURIComponent(boardId)}`,
  )
  return response.data
}
