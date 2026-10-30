import type { Capability, PermisoColaborador } from './apiTypes'

export interface Patient {
  id: string
  firstName: string
  lastName: string
  fullName: string
  /** ISO local date, `YYYY-MM-DD`; use `formatBirthDate` for display. */
  birthDate: string
  organizationId: string
  /** Set only for family links; null for the clinical team. Display only: permissions use `capabilities`. */
  collaboratorPermission: PermisoColaborador | null
  /** Preferred Modo Uso grid size (6/9/12); null when not set. */
  /** What the current user may do over this patient, as decided by the backend. */
  capabilities: Capability[]
  gridSize: number | null
}
