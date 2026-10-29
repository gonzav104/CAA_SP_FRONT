import { useQuery } from '@tanstack/react-query'
import type { OrganizacionResponse } from './apiTypes'
import { fetchOrganizations } from './organizationsApi'

export const organizationKeys = { all: ['organizations'] as const }

export function useOrganizations() {
  return useQuery<OrganizacionResponse[]>({
    queryKey: organizationKeys.all,
    queryFn: fetchOrganizations,
    staleTime: 5 * 60 * 1000,
  })
}
