import { api } from '@/api/client'
import type { ColaboradorActualizacionRequest, ColaboradorRegistroRequest, ColaboradorResponse } from './apiTypes'

function basePath(patientId: string): string {
  return `/api/pacientes/${encodeURIComponent(patientId)}/colaboradores`
}

export async function fetchCollaborators(patientId: string): Promise<ColaboradorResponse[]> {
  const response = await api.get<ColaboradorResponse[]>(basePath(patientId))
  return response.data
}

export async function linkCollaborator(
  patientId: string,
  request: ColaboradorRegistroRequest,
): Promise<ColaboradorResponse> {
  const response = await api.post<ColaboradorResponse>(basePath(patientId), request)
  return response.data
}

export async function updateCollaboratorPermission(
  patientId: string,
  userId: string,
  request: ColaboradorActualizacionRequest,
): Promise<ColaboradorResponse> {
  const response = await api.put<ColaboradorResponse>(
    `${basePath(patientId)}/${encodeURIComponent(userId)}`,
    request,
  )
  return response.data
}

export async function revokeCollaborator(patientId: string, userId: string): Promise<void> {
  await api.delete(`${basePath(patientId)}/${encodeURIComponent(userId)}`)
}
