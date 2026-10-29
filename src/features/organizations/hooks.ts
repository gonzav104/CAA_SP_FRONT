import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getErrorStatus } from '@/api/errors'
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

// Members and pending invitations change from outside this screen (an invitee accepts from the e-mail,
// another manager edits the team): always stale, so every mount and window focus refetches them.
export function useMembers(organizationId: string, enabled = true) {
  return useQuery<MiembroResponse[]>({
    queryKey: organizationKeys.members(organizationId),
    queryFn: () => fetchMembers(organizationId),
    staleTime: 0,
    enabled,
  })
}

export function useOrganizationInvitations(organizationId: string, enabled: boolean) {
  return useQuery<InvitacionResponse[]>({
    queryKey: organizationKeys.invitations(organizationId),
    queryFn: () => fetchOrganizationInvitations(organizationId),
    staleTime: 0,
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

/**
 * A 403/404 on a membership or invitation write means the caller's own role or membership changed
 * elsewhere (demoted, removed): refetch what decides the visible actions instead of keeping stale ones.
 */
function refreshOnRefusal(queryClient: ReturnType<typeof useQueryClient>, organizationId: string) {
  return (error: Error) => {
    const status = getErrorStatus(error)
    if (status === 403 || status === 404) invalidateMembership(queryClient, organizationId)
  }
}

/** A 409 on invite/resend means the person already is a member (e.g. the invitation was just accepted). */
function refreshOnInviteRefusal(queryClient: ReturnType<typeof useQueryClient>, organizationId: string) {
  const refreshMembership = refreshOnRefusal(queryClient, organizationId)
  return (error: Error) => {
    if (getErrorStatus(error) === 409) {
      void queryClient.invalidateQueries({ queryKey: organizationKeys.invitations(organizationId) })
      void queryClient.invalidateQueries({ queryKey: organizationKeys.members(organizationId) })
    }
    refreshMembership(error)
  }
}

export function useChangeMemberRole(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation<MiembroResponse, Error, { userId: string; rolGestion: RolGestionAsignable }>({
    mutationFn: ({ userId, rolGestion }) => changeMemberRole(organizationId, userId, rolGestion),
    onSuccess: () => invalidateMembership(queryClient, organizationId),
    onError: refreshOnRefusal(queryClient, organizationId),
  })
}

export function useChangeMemberTherapist(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation<MiembroResponse, Error, { userId: string; esTerapeuta: boolean }>({
    mutationFn: ({ userId, esTerapeuta }) => changeMemberTherapist(organizationId, userId, esTerapeuta),
    onSuccess: () => invalidateMembership(queryClient, organizationId),
    onError: refreshOnRefusal(queryClient, organizationId),
  })
}

export function useRemoveMember(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (userId) => removeMember(organizationId, userId),
    onSuccess: () => invalidateMembership(queryClient, organizationId),
    onError: refreshOnRefusal(queryClient, organizationId),
  })
}

export function useInviteToOrganization(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation<InvitacionResponse, Error, InvitacionOrganizacionRequest>({
    mutationFn: (request) => inviteToOrganization(organizationId, request),
    // Only the pending invitations change: nobody becomes a member until accepting.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: organizationKeys.invitations(organizationId) }),
    onError: refreshOnInviteRefusal(queryClient, organizationId),
  })
}

export function useRevokeOrganizationInvitation(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (invitationId) => revokeOrganizationInvitation(organizationId, invitationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: organizationKeys.invitations(organizationId) }),
    onError: refreshOnRefusal(queryClient, organizationId),
  })
}
