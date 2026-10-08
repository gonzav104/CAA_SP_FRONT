import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColaboradorActualizacionRequest, ColaboradorRegistroRequest, ColaboradorResponse } from './apiTypes'
import {
  fetchCollaborators,
  linkCollaborator,
  revokeCollaborator,
  updateCollaboratorPermission,
} from './collaboratorsApi'
import { toCollaborator, toCollaborators } from './mappers'
import type { Collaborator } from './types'

export const collaboratorKeys = {
  all: ['collaborators'] as const,
  list: (patientId: string) => ['collaborators', 'patient', patientId, 'list'] as const,
}

const STALE_TIME = 30_000

export function useCollaborators(patientId: string) {
  return useQuery<ColaboradorResponse[], Error, Collaborator[]>({
    queryKey: collaboratorKeys.list(patientId),
    queryFn: () => fetchCollaborators(patientId),
    select: toCollaborators,
    staleTime: STALE_TIME,
  })
}

export function useLinkCollaborator(patientId: string) {
  const queryClient = useQueryClient()
  return useMutation<Collaborator, Error, ColaboradorRegistroRequest>({
    mutationFn: async (request) => toCollaborator(await linkCollaborator(patientId, request)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: collaboratorKeys.list(patientId) })
    },
  })
}

export function useUpdateCollaboratorPermission(patientId: string) {
  const queryClient = useQueryClient()
  return useMutation<Collaborator, Error, { userId: string; request: ColaboradorActualizacionRequest }>({
    mutationFn: async ({ userId, request }) =>
      toCollaborator(await updateCollaboratorPermission(patientId, userId, request)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: collaboratorKeys.list(patientId) })
    },
  })
}

export function useRevokeCollaborator(patientId: string) {
  const queryClient = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (userId) => revokeCollaborator(patientId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: collaboratorKeys.list(patientId) })
    },
  })
}
