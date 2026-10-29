import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { OrganizacionResponse } from './apiTypes'
import { createOrganization, fetchOrganizations } from './organizationsApi'

export const organizationKeys = { all: ['organizations'] as const }

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
