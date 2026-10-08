import { api } from '@/api/client'
import type { SesionResponse, SesionWriteRequest } from './apiTypes'

function basePath(patientId: string): string {
  return `/api/pacientes/${encodeURIComponent(patientId)}/sesiones`
}

export async function fetchSessions(patientId: string): Promise<SesionResponse[]> {
  const response = await api.get<SesionResponse[]>(basePath(patientId))
  return response.data
}

export async function createSession(patientId: string, request: SesionWriteRequest): Promise<SesionResponse> {
  const response = await api.post<SesionResponse>(basePath(patientId), request)
  return response.data
}

export async function updateSession(
  patientId: string,
  sessionId: string,
  request: SesionWriteRequest,
): Promise<SesionResponse> {
  const response = await api.put<SesionResponse>(`${basePath(patientId)}/${encodeURIComponent(sessionId)}`, request)
  return response.data
}

export async function deleteSession(patientId: string, sessionId: string): Promise<void> {
  await api.delete(`${basePath(patientId)}/${encodeURIComponent(sessionId)}`)
}
