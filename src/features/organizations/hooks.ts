import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { InvitacionResponse } from '@/features/collaborators/apiTypes'
import { patientKeys } from '@/features/patients/hooks'
import type { InvitacionOrganizacionRequest, MiembroResponse, OrganizacionResponse, RolGestionAsignable } from './apiTypes'
import {
  changeMemberRole,
  changeMemberTherapist,
  fetchMembers,
  fetchOrganizationInvitations,
  inviteToOrganization,
  removeMember,
  revokeOrganizationInvitation,
} from './membersApi'
import { createOrganization, fetchOrganizations } from './organizationsApi'

export const organizationKeys = {
  all: ['organizations'] as const,
  members: (organizationId: string) => ['organizations', organizationId, 'members'] as const,
  invitations: (organizationId: string) => ['organizations', organizationId, 'invitations'] as const,
}

const STALE_TIME = 30_000

export function useOrganizations() {
  return useQuery<OrganizacionResponse[]>({
    queryKey: organizationKeys.all,
    queryFn: fetchOrganizations,
    staleTime: 5 * 60 * 1000,
  })
}

/** Creates a workspace, then refetches the memberships so the new one comes from the server truth. */
export function useCreateOrganization() {
  const queryClient = useQueryClient()
  return useMutation<OrganizacionResponse, Error, string>({
    mutationFn: (nombre) => createOrganization({ nombre }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: organizationKeys.all }),
  })
}

export function useMembers(organizationId: string, enabled = true) {
  return useQuery<MiembroResponse[]>({
    queryKey: organizationKeys.members(organizationId),
    queryFn: () => fetchMembers(organizationId),
    staleTime: STALE_TIME,
    enabled,
  })
}

export function useOrganizationInvitations(organizationId: string, enabled: boolean) {
  return useQuery<InvitacionResponse[]>({
    queryKey: organizationKeys.invitations(organizationId),
    queryFn: () => fetchOrganizationInvitations(organizationId),
    staleTime: STALE_TIME,
    enabled,
  })
}

/**
 * Any membership change can change what the caller's own memberships report (`organizations`) and the
 * capabilities the backend computes per patient (`patients`): refetch them with the member list.
 */
function invalidateMembership(queryClient: ReturnType<typeof useQueryClient>, organizationId: string) {
  void queryClient.invalidateQueries({ queryKey: organizationKeys.members(organizationId) })
  void queryClient.invalidateQueries({ queryKey: organizationKeys.all, exact: true })
  void queryClient.invalidateQueries({ queryKey: patientKeys.all })
}

export function useChangeMemberRole(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation<MiembroResponse, Error, { userId: string; rolGestion: RolGestionAsignable }>({
    mutationFn: ({ userId, rolGestion }) => changeMemberRole(organizationId, userId, rolGestion),
    onSuccess: () => invalidateMembership(queryClient, organizationId),
  })
}

export function useChangeMemberTherapist(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation<MiembroResponse, Error, { userId: string; esTerapeuta: boolean }>({
    mutationFn: ({ userId, esTerapeuta }) => changeMemberTherapist(organizationId, userId, esTerapeuta),
    onSuccess: () => invalidateMembership(queryClient, organizationId),
  })
}

export function useRemoveMember(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (userId) => removeMember(organizationId, userId),
    onSuccess: () => invalidateMembership(queryClient, organizationId),
  })
}

export function useInviteToOrganization(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation<InvitacionResponse, Error, InvitacionOrganizacionRequest>({
    mutationFn: (request) => inviteToOrganization(organizationId, request),
    // Only the pending invitations change: nobody becomes a member until accepting.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: organizationKeys.invitations(organizationId) }),
  })
}

export function useRevokeOrganizationInvitation(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (invitationId) => revokeOrganizationInvitation(organizationId, invitationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: organizationKeys.invitations(organizationId) }),
  })
}
