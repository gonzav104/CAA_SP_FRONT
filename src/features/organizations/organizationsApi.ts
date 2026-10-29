import { api } from '@/api/client'
import type { OrganizacionResponse } from './apiTypes'

export async function fetchOrganizations(): Promise<OrganizacionResponse[]> {
  const response = await api.get<OrganizacionResponse[]>('/api/organizaciones')
  return response.data
}
