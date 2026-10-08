import type { PictogramaCustomResponse } from './apiTypes'
import type { CustomPictogram } from './types'

export function toCustomPictogram(dto: PictogramaCustomResponse): CustomPictogram {
  return {
    id: dto.id,
    patientId: dto.pacienteId,
    label: dto.etiqueta,
    imageUrl: dto.imagenUrl,
    createdAt: dto.creadoEn,
  }
}

/** Sorted by label: browsing a library reads better alphabetically than by upload order. */
export function toCustomPictograms(dtos: PictogramaCustomResponse[]): CustomPictogram[] {
  return dtos.map(toCustomPictogram).sort((a, b) => a.label.localeCompare(b.label, 'es'))
}
