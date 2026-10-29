import type { Patient } from '@/features/patients/types'
import type { OrganizacionResponse, RolGestion } from './apiTypes'

/**
 * A "space" is only a view over data the backend already returns: one organization the user belongs
 * to, or the patients shared with them as family. It lives in the URL (`?espacio=`), is re-validated
 * against the current memberships on every render and never grants anything.
 */
export const SHARED_SPACE_ID = 'compartidos'

export type Space =
  | { kind: 'all' }
  | { kind: 'organization'; organization: OrganizacionResponse }
  | { kind: 'shared' }

export const ROL_GESTION_LABELS: Record<RolGestion, string> = {
  OWNER: 'Propietario',
  ADMIN: 'Administrador',
  MIEMBRO: 'Miembro',
}

/** "Propietario · Terapeuta": the management role, plus the clinical role when it applies. */
export function membershipLabel(organization: OrganizacionResponse): string {
  const role = ROL_GESTION_LABELS[organization.miRolGestion]
  return organization.miEsTerapeuta ? `${role} · Terapeuta` : role
}

/** Patients reached through a family link (the backend sets `miPermiso` only for those). */
export function sharedPatients(patients: readonly Patient[]): Patient[] {
  return patients.filter((patient) => patient.collaboratorPermission !== null)
}

/**
 * Resolves `?espacio=`. An id that is not among the current memberships (e.g. the membership was
 * removed) is reported as `stale` and the view falls back to every patient instead of failing.
 */
export function resolveSpace(
  spaceId: string | null,
  organizations: readonly OrganizacionResponse[] | undefined,
): { space: Space; stale: boolean } {
  if (!spaceId) return { space: { kind: 'all' }, stale: false }
  if (spaceId === SHARED_SPACE_ID) return { space: { kind: 'shared' }, stale: false }
  // While memberships load nothing is decided yet: show everything, report nothing.
  if (!organizations) return { space: { kind: 'all' }, stale: false }
  const organization = organizations.find((org) => org.id === spaceId)
  return organization ? { space: { kind: 'organization', organization }, stale: false } : { space: { kind: 'all' }, stale: true }
}

export function patientsInSpace(patients: readonly Patient[], space: Space): Patient[] {
  if (space.kind === 'shared') return sharedPatients(patients)
  if (space.kind === 'organization') {
    // The clinical-team patients of that organization; family links stay in the shared space.
    return patients.filter(
      (patient) => patient.organizationId === space.organization.id && patient.collaboratorPermission === null,
    )
  }
  return [...patients]
}
