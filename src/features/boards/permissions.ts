import type { CurrentUser } from '@/features/auth/types'
import type { Patient } from '@/features/patients/types'
import type { BoardSummary } from './types'

// Mirrors the backend ownership check used for item edits: only the board's creator may edit.
// Renaming, deleting and opening the Editor are creator-only too (being the responsible therapist is not enough).
export function canEditBoard(user: CurrentUser | null | undefined, creatorId: string): boolean {
  return !!user && user.id === creatorId
}

/** The patient's responsible therapist: a therapist who is not a collaborator of the patient. */
export function isResponsibleTherapist(
  user: CurrentUser | null | undefined,
  patient: Patient | null | undefined,
): boolean {
  return !!user && !!patient && user.rol === 'TERAPEUTA' && patient.collaboratorPermission === null
}

/** Creating a cartilla: the responsible therapist or a family collaborator with limited edition. */
export function canCreateBoard(user: CurrentUser | null | undefined, patient: Patient | null | undefined): boolean {
  if (!user || !patient) return false
  return isResponsibleTherapist(user, patient) || patient.collaboratorPermission === 'EDICION_LIMITADA'
}

/** Marking a cartilla as principal: the responsible therapist, for any creator, unless it already is the principal. */
export function canSetPrimaryBoard(
  user: CurrentUser | null | undefined,
  patient: Patient | null | undefined,
  board: Pick<BoardSummary, 'isPrimary'>,
): boolean {
  return isResponsibleTherapist(user, patient) && !board.isPrimary
}
