import type { CurrentUser } from '@/features/auth/types'
import type { Patient } from './types'

// Mirrors the backend check in PacienteServiceImpl.registrarPaciente: "Solo un terapeuta puede
// registrar un paciente" — a plain role check, no ownership or collaborator concept involved yet.
export function canCreatePatient(user: CurrentUser | null | undefined): boolean {
  return !!user && user.rol === 'TERAPEUTA'
}

/** The patient's responsible therapist: a therapist who is not a collaborator of the patient. */
export function isResponsibleTherapist(
  user: CurrentUser | null | undefined,
  patient: Patient | null | undefined,
): boolean {
  return !!user && !!patient && user.rol === 'TERAPEUTA' && patient.collaboratorPermission === null
}

// Mirrors PacienteServiceImpl.actualizarPaciente/eliminarPaciente: both use findByIdAndTerapeutaId —
// only the responsible therapist may edit the patient's own data or delete the patient. A family
// collaborator, even with EDICION_LIMITADA, cannot (that permission only reaches cartillas/pictograms).
export const canEditPatientData = isResponsibleTherapist
export const canDeletePatient = isResponsibleTherapist

// Mirrors SesionServiceImpl / ColaboradorServiceImpl: both resolve the patient with
// findByIdAndTerapeutaId only — a linked familiar gets a plain 404, not a restricted view. There is
// no real read-only mode to render for these two sections, so the only honest option is to hide them.
export const canAccessSessions = isResponsibleTherapist
export const canAccessCollaborators = isResponsibleTherapist
