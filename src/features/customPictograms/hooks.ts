import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PictogramaCustomResponse } from './apiTypes'
import {
  createCustomPictogram,
  deleteCustomPictogram,
  fetchCustomPictograms,
  updateCustomPictogram,
} from './customPictogramsApi'
import type { UpdateCustomPictogramInput } from './customPictogramsApi'
import { toCustomPictogram, toCustomPictograms } from './mappers'
import type { CustomPictogram } from './types'

export const customPictogramKeys = {
  all: ['customPictograms'] as const,
  list: (patientId: string) => ['customPictograms', 'patient', patientId, 'list'] as const,
}

const STALE_TIME = 30_000

export function useCustomPictograms(patientId: string) {
  return useQuery<PictogramaCustomResponse[], Error, CustomPictogram[]>({
    queryKey: customPictogramKeys.list(patientId),
    queryFn: () => fetchCustomPictograms(patientId),
    select: toCustomPictograms,
    staleTime: STALE_TIME,
  })
}

export function useCreateCustomPictogram(patientId: string) {
  const queryClient = useQueryClient()
  return useMutation<CustomPictogram, Error, { etiqueta: string; archivo: File }>({
    mutationFn: async ({ etiqueta, archivo }) =>
      toCustomPictogram(await createCustomPictogram(patientId, etiqueta, archivo)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: customPictogramKeys.list(patientId) })
    },
  })
}

export function useUpdateCustomPictogram(patientId: string) {
  const queryClient = useQueryClient()
  return useMutation<CustomPictogram, Error, { id: string; input: UpdateCustomPictogramInput }>({
    mutationFn: async ({ id, input }) => toCustomPictogram(await updateCustomPictogram(patientId, id, input)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: customPictogramKeys.list(patientId) })
    },
  })
}

export function useDeleteCustomPictogram(patientId: string) {
  const queryClient = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (id) => deleteCustomPictogram(patientId, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: customPictogramKeys.list(patientId) })
    },
  })
}
