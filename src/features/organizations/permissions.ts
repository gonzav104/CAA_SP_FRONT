import type { OrganizacionResponse } from './apiTypes'

// Creating a patient is not a per-patient capability: the backend requires the user to manage an
// organization (OWNER/ADMIN) or to be a therapist in it. Without organizations there is nothing to create in.
export function canCreatePatient(organizations: readonly OrganizacionResponse[] | null | undefined): boolean {
  return !!organizations?.some((org) => org.miRolGestion === 'OWNER' || org.miRolGestion === 'ADMIN' || org.miEsTerapeuta)
}
