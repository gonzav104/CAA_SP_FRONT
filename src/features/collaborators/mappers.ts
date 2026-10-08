import type { ColaboradorResponse } from './apiTypes'
import type { Collaborator } from './types'

export function toCollaborator(dto: ColaboradorResponse): Collaborator {
  return {
    userId: dto.usuarioId,
    name: dto.nombre,
    email: dto.email,
    permission: dto.permiso,
    linkedAt: dto.vinculadoEn,
  }
}

/** Sorted by name. */
export function toCollaborators(dtos: ColaboradorResponse[]): Collaborator[] {
  return dtos.map(toCollaborator).sort((a, b) => a.name.localeCompare(b.name, 'es'))
}
