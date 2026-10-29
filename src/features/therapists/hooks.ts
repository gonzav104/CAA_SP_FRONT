import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getErrorStatus } from '@/api/errors'
import { patientKeys } from '@/features/patients/hooks'
import type { TerapeutaAsignadoResponse } from './apiTypes'
import { assignTherapist, fetchAssignedTherapists, unassignTherapist } from './therapistsApi'

export const therapistKeys = {
  list: (patientId: string) => ['patients', 'detail', patientId, 'therapists'] as const,
}

export function useAssignedTherapists(patientId: string, enabled: boolean) {
  return useQuery<TerapeutaAsignadoResponse[]>({
    queryKey: therapistKeys.list(patientId),
    queryFn: () => fetchAssignedTherapists(patientId),
    staleTime: 30_000,
    enabled,
  })
}

// An assignment changes the capabilities the backend computes for that therapist on this patient (and
// the caller's own, when assigning themselves): refresh the list and every patient query with it.
export function useAssignTherapist(patientId: string) {
  const queryClient = useQueryClient()
  return useMutation<TerapeutaAsignadoResponse, Error, string>({
    mutationFn: (userId) => assignTherapist(patientId, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: patientKeys.all }),
    // 404: ADMINISTRAR (or the patient) is gone; refetch the patient so its capabilities hide the controls.
    onError: (error) => {
      if (getErrorStatus(error) === 404) void queryClient.invalidateQueries({ queryKey: patientKeys.all })
    },
  })
}

export function useUnassignTherapist(patientId: string) {
  const queryClient = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (userId) => unassignTherapist(patientId, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: patientKeys.all }),
    // 404: ADMINISTRAR (or the patient) is gone; refetch the patient so its capabilities hide the controls.
    onError: (error) => {
      if (getErrorStatus(error) === 404) void queryClient.invalidateQueries({ queryKey: patientKeys.all })
    },
  })
}
