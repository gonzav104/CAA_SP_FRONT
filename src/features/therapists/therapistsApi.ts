import { api } from '@/api/client'
import type { TerapeutaAsignadoResponse } from './apiTypes'

const basePath = (patientId: string) => `/api/pacientes/${encodeURIComponent(patientId)}/terapeutas`

/** Assigned therapists; needs GESTION_CLINICA on the patient. */
export async function fetchAssignedTherapists(patientId: string): Promise<TerapeutaAsignadoResponse[]> {
  const response = await api.get<TerapeutaAsignadoResponse[]>(basePath(patientId))
  return response.data
}

/** Needs ADMINISTRAR; the user must be a therapist member of the patient's own organization (else 404/409). */
export async function assignTherapist(patientId: string, userId: string): Promise<TerapeutaAsignadoResponse> {
  const response = await api.post<TerapeutaAsignadoResponse>(basePath(patientId), { usuarioId: userId })
  return response.data
}

/** Needs ADMINISTRAR; idempotent (204 also when there was no assignment). */
export async function unassignTherapist(patientId: string, userId: string): Promise<void> {
  await api.delete(`${basePath(patientId)}/${encodeURIComponent(userId)}`)
}
