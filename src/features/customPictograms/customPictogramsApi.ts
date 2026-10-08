import { api } from '@/api/client'
import type { PictogramaCustomResponse } from './apiTypes'

function basePath(patientId: string): string {
  return `/api/pacientes/${encodeURIComponent(patientId)}/pictogramas-custom`
}

export async function fetchCustomPictograms(patientId: string): Promise<PictogramaCustomResponse[]> {
  const response = await api.get<PictogramaCustomResponse[]>(basePath(patientId))
  return response.data
}

export async function createCustomPictogram(
  patientId: string,
  etiqueta: string,
  archivo: File,
): Promise<PictogramaCustomResponse> {
  const formData = new FormData()
  formData.set('etiqueta', etiqueta)
  formData.set('archivo', archivo)
  const response = await api.post<PictogramaCustomResponse>(basePath(patientId), formData)
  return response.data
}

export interface UpdateCustomPictogramInput {
  etiqueta?: string
  archivo?: File
}

export async function updateCustomPictogram(
  patientId: string,
  id: string,
  { etiqueta, archivo }: UpdateCustomPictogramInput,
): Promise<PictogramaCustomResponse> {
  const formData = new FormData()
  if (etiqueta !== undefined) formData.set('etiqueta', etiqueta)
  if (archivo !== undefined) formData.set('archivo', archivo)
  const response = await api.put<PictogramaCustomResponse>(
    `${basePath(patientId)}/${encodeURIComponent(id)}`,
    formData,
  )
  return response.data
}

export async function deleteCustomPictogram(patientId: string, id: string): Promise<void> {
  await api.delete(`${basePath(patientId)}/${encodeURIComponent(id)}`)
}
