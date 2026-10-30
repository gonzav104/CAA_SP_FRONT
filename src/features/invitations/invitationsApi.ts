import { api } from '@/api/client'
import type { AceptarInvitacionResponse } from './apiTypes'

// The token travels only in the body, never in the request URL.
export async function acceptInvitation(token: string): Promise<AceptarInvitacionResponse> {
  const response = await api.post<AceptarInvitacionResponse>('/api/invitaciones/aceptar', { token })
  return response.data
}
