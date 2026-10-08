import type { PermisoColaborador } from './apiTypes'

export interface Collaborator {
  userId: string
  name: string
  email: string
  permission: PermisoColaborador
  /** ISO local datetime. */
  linkedAt: string
}
