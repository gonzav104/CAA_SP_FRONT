import { hasCapability } from '@/features/patients/permissions'
import type { Patient } from '@/features/patients/types'

type MaybePatient = Patient | null | undefined

export const canEditCustomPictograms = (patient: MaybePatient) => hasCapability(patient, 'EDITAR_CONTENIDO')

// Deleting a custom pictogram is clinical-team only, even for a family member who may create/edit.
export const canDeleteCustomPictogram = (patient: MaybePatient) => hasCapability(patient, 'GESTION_CLINICA')
