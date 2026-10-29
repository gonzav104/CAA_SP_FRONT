import type { EstadoInvitacion, PermisoColaborador } from './apiTypes'

export interface Collaborator {
  userId: string
  name: string
  email: string
  permission: PermisoColaborador
  /** ISO local datetime. */
  linkedAt: string
}

/** A family invitation not accepted yet: grants nothing until the invited person accepts it. */
export interface FamilyInvitation {
  id: string
  email: string
  permission: PermisoColaborador
  status: EstadoInvitacion
  /** ISO local datetime; null when the backend does not report it. */
  expiresAt: string | null
}
