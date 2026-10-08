import { api } from '@/api/client'
import type { PacienteActualizacionRequest, PacienteRegistroRequest, PacienteResponse } from './apiTypes'

export async function fetchPatients(): Promise<PacienteResponse[]> {
  const response = await api.get<PacienteResponse[]>('/api/pacientes')
  return response.data
}

export async function fetchPatient(id: string): Promise<PacienteResponse> {
  const response = await api.get<PacienteResponse>(`/api/pacientes/${encodeURIComponent(id)}`)
  return response.data
}

export async function createPatient(request: PacienteRegistroRequest): Promise<PacienteResponse> {
  const response = await api.post<PacienteResponse>('/api/pacientes', request)
  return response.data
}

export async function updatePatient(id: string, request: PacienteActualizacionRequest): Promise<PacienteResponse> {
  const response = await api.put<PacienteResponse>(`/api/pacientes/${encodeURIComponent(id)}`, request)
  return response.data
}

export async function deletePatient(id: string): Promise<void> {
  await api.delete(`/api/pacientes/${encodeURIComponent(id)}`)
}
