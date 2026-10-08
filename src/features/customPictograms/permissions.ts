import type { CurrentUser } from '@/features/auth/types'
import { isResponsibleTherapist } from '@/features/patients/permissions'
import type { Patient } from '@/features/patients/types'

// Mirrors PictogramaCustomServiceImpl: crearPictograma/actualizarPictograma use
// verificarEdicionParaUsuario (therapist, or a family collaborator with EDICION_LIMITADA).
export function canEditCustomPictograms(
  user: CurrentUser | null | undefined,
  patient: Patient | null | undefined,
): boolean {
  if (!user || !patient) return false
  return isResponsibleTherapist(user, patient) || patient.collaboratorPermission === 'EDICION_LIMITADA'
}

// Mirrors PictogramaCustomServiceImpl.eliminarPictograma: findByIdAndTerapeutaId only — the
// responsible therapist, even for a familiar with EDICION_LIMITADA who may create/edit.
export const canDeleteCustomPictogram = isResponsibleTherapist
