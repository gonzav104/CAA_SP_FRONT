import type { Capability } from './apiTypes'
import type { Patient } from './types'

// Every UI permission reads `patient.capabilities`, computed by the backend per patient. A missing
// capability grants nothing; the backend still validates each operation and stays the authority.
export function hasCapability(patient: Patient | null | undefined, capability: Capability): boolean {
  return !!patient && patient.capabilities.includes(capability)
}

export const canEditPatientData = (patient: Patient | null | undefined) => hasCapability(patient, 'EDITAR_CONTENIDO')
export const canDeletePatient = (patient: Patient | null | undefined) => hasCapability(patient, 'ADMINISTRAR')

// The Equipo section: seeing the assigned therapists is clinical-team only; assigning needs ADMINISTRAR.
export const canViewTherapists = (patient: Patient | null | undefined) => hasCapability(patient, 'GESTION_CLINICA')
export const canManageTherapists = (patient: Patient | null | undefined) => hasCapability(patient, 'ADMINISTRAR')

// Sessions and the family section are clinical-team only: a linked family member gets a 404 there.
export const canAccessSessions = (patient: Patient | null | undefined) => hasCapability(patient, 'GESTION_CLINICA')
export const canAccessCollaborators = (patient: Patient | null | undefined) =>
  hasCapability(patient, 'GESTION_CLINICA')
