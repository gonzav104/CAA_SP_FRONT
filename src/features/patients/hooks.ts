import { useQuery } from '@tanstack/react-query'
import type { PacienteResponse } from './apiTypes'
import { toPatient, toPatients } from './mappers'
import { fetchPatient, fetchPatients } from './patientsApi'

export const patientKeys = {
  all: ['patients'] as const,
  list: () => ['patients', 'list'] as const,
  detail: (id: string) => ['patients', 'detail', id] as const,
}

const STALE_TIME = 30_000

// The cache keeps the raw DTO; the module-level `select` functions keep the mapped result stable.
export function usePatients() {
  return useQuery<PacienteResponse[], Error, ReturnType<typeof toPatients>>({
    queryKey: patientKeys.list(),
    queryFn: fetchPatients,
    select: toPatients,
    staleTime: STALE_TIME,
  })
}

export function usePatient(id: string) {
  return useQuery<PacienteResponse, Error, ReturnType<typeof toPatient>>({
    queryKey: patientKeys.detail(id),
    queryFn: () => fetchPatient(id),
    select: toPatient,
    staleTime: STALE_TIME,
  })
}
