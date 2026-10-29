import type { OrganizacionResponse } from './apiTypes'

type MaybeOrganizations = readonly OrganizacionResponse[] | null | undefined

// Mirrors AccesoServiceImpl.exigirAltaPaciente: a patient can be registered in an organization the
// user manages (OWNER/ADMIN) or where they are a therapist. Creating is not a per-patient capability.
export function canCreatePatientIn(organization: OrganizacionResponse): boolean {
  return organization.miRolGestion === 'OWNER' || organization.miRolGestion === 'ADMIN' || organization.miEsTerapeuta
}

/** Organizations where the user may register a patient; empty while they load. */
export function patientCreationOrganizations(organizations: MaybeOrganizations): OrganizacionResponse[] {
  return organizations?.filter(canCreatePatientIn) ?? []
}

export function canCreatePatient(organizations: MaybeOrganizations): boolean {
  return patientCreationOrganizations(organizations).length > 0
}
