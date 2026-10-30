import type { TipoInvitacion } from '@/features/collaborators/apiTypes'

// Mirrors AceptarInvitacionDTO.
export interface AceptarInvitacionRequest {
  token: string
}

// Mirrors AceptarInvitacionResponseDTO: exactly one of organizacionId/pacienteId is set, per `tipo`.
export interface AceptarInvitacionResponse {
  tipo: TipoInvitacion
  organizacionId: string | null
  pacienteId: string | null
}
