import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getErrorStatus } from '@/api/errors'
import { organizationKeys } from '@/features/organizations/hooks'
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
export function useAssignTherapist(patientId: string, organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation<TerapeutaAsignadoResponse, Error, string>({
    mutationFn: (userId) => assignTherapist(patientId, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: patientKeys.all }),
    onError: (error) => {
      const status = getErrorStatus(error)
      // 404: ADMINISTRAR (or the patient) is gone; refetch the patient so its capabilities hide the controls.
      if (status === 404) void queryClient.invalidateQueries({ queryKey: patientKeys.all })
      // 404/409: the candidate is no longer a (therapist) member; refetch the candidates.
      if (status === 404 || status === 409) {
        void queryClient.invalidateQueries({ queryKey: organizationKeys.members(organizationId) })
      }
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
