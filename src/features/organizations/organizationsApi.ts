import { api } from '@/api/client'
import type { OrganizacionRegistroRequest, OrganizacionResponse } from './apiTypes'

export async function fetchOrganizations(): Promise<OrganizacionResponse[]> {
  const response = await api.get<OrganizacionResponse[]>('/api/organizaciones')
  return response.data
}

/** 201 with the new organization, where the creator already is OWNER. */
export async function createOrganization(request: OrganizacionRegistroRequest): Promise<OrganizacionResponse> {
  const response = await api.post<OrganizacionResponse>('/api/organizaciones', request)
  return response.data
}
