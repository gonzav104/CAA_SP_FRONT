import { hasCapability } from '@/features/patients/permissions'
import type { Patient } from '@/features/patients/types'
import type { BoardSummary } from './types'

type MaybePatient = Patient | null | undefined

// Access comes from the patient, never from who created the cartilla.
/** Creating, renaming and opening the Editor of a cartilla. */
export const canCreateBoard = (patient: MaybePatient) => hasCapability(patient, 'EDITAR_CONTENIDO')
export const canEditBoard = canCreateBoard

/** Deleting a cartilla is clinical-team only. */
export const canDeleteBoard = (patient: MaybePatient) => hasCapability(patient, 'GESTION_CLINICA')

/** Marking a cartilla as principal: clinical team only, and not when it already is the principal. */
export function canSetPrimaryBoard(patient: MaybePatient, board: Pick<BoardSummary, 'isPrimary'>): boolean {
  return hasCapability(patient, 'GESTION_CLINICA') && !board.isPrimary
}
