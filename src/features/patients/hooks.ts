import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PacienteActualizacionRequest, PacienteRegistroRequest, PacienteResponse } from './apiTypes'
import { toPatient, toPatients } from './mappers'
import { createPatient, deletePatient, fetchPatient, fetchPatients, updatePatient } from './patientsApi'
import type { Patient } from './types'

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

/** Creates a patient, then refetches the directory so the new one shows up from the server truth. */
export function useCreatePatient() {
  const queryClient = useQueryClient()
  return useMutation<Patient, Error, PacienteRegistroRequest>({
    mutationFn: async (request) => toPatient(await createPatient(request)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: patientKeys.list() })
    },
  })
}

/** Updates a patient's own data, then refreshes both the directory and this patient's detail. */
export function useUpdatePatient(id: string) {
  const queryClient = useQueryClient()
  return useMutation<Patient, Error, PacienteActualizacionRequest>({
    mutationFn: async (request) => toPatient(await updatePatient(id, request)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: patientKeys.list() })
      void queryClient.invalidateQueries({ queryKey: patientKeys.detail(id) })
    },
  })
}

/** Deletes a patient. The backend cascades their boards, sessions, custom pictograms and collaborators. */
export function useDeletePatient() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (id) => deletePatient(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: patientKeys.detail(id) })
      void queryClient.invalidateQueries({ queryKey: patientKeys.list() })
    },
  })
}
