import type { PermisoColaborador } from './apiTypes'

export interface Patient {
  id: string
  firstName: string
  lastName: string
  fullName: string
  /** ISO local date, `YYYY-MM-DD`; use `formatBirthDate` for display. */
  birthDate: string
  /** Set only for family collaborators; null for the owning therapist. */
  collaboratorPermission: PermisoColaborador | null
}
