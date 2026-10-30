import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  ColaboradorActualizacionRequest,
  ColaboradorRegistroRequest,
  ColaboradorResponse,
  InvitacionResponse,
} from './apiTypes'
import {
  fetchCollaborators,
  fetchFamilyInvitations,
  inviteCollaborator,
  revokeCollaborator,
  revokeFamilyInvitation,
  updateCollaboratorPermission,
} from './collaboratorsApi'
import { toCollaborator, toCollaborators, toFamilyInvitations } from './mappers'
import type { Collaborator, FamilyInvitation } from './types'

export const collaboratorKeys = {
  all: ['collaborators'] as const,
  list: (patientId: string) => ['collaborators', 'patient', patientId, 'list'] as const,
  invitations: (patientId: string) => ['collaborators', 'patient', patientId, 'invitations'] as const,
}

const STALE_TIME = 30_000

// `enabled`: the Familia section is clinical-team only; without GESTION_CLINICA nothing is requested.
export function useCollaborators(patientId: string, enabled = true) {
  return useQuery<ColaboradorResponse[], Error, Collaborator[]>({
    queryKey: collaboratorKeys.list(patientId),
    queryFn: () => fetchCollaborators(patientId),
    select: toCollaborators,
    staleTime: STALE_TIME,
    enabled,
  })
}

export function useFamilyInvitations(patientId: string, enabled = true) {
  return useQuery<InvitacionResponse[], Error, FamilyInvitation[]>({
    queryKey: collaboratorKeys.invitations(patientId),
    queryFn: () => fetchFamilyInvitations(patientId),
    select: toFamilyInvitations,
    staleTime: STALE_TIME,
    enabled,
  })
}

/** Sends (or resends) a family invitation. Only the pending invitations change: nobody is linked yet. */
export function useInviteCollaborator(patientId: string) {
  const queryClient = useQueryClient()
  return useMutation<InvitacionResponse, Error, ColaboradorRegistroRequest>({
    mutationFn: (request) => inviteCollaborator(patientId, request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: collaboratorKeys.invitations(patientId) })
    },
  })
}

export function useRevokeFamilyInvitation(patientId: string) {
  const queryClient = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (invitationId) => revokeFamilyInvitation(patientId, invitationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: collaboratorKeys.invitations(patientId) })
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
