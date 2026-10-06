import type { PacienteResponse } from './apiTypes'
import type { Patient } from './types'

export function toPatient(dto: PacienteResponse): Patient {
  return {
    id: dto.id,
    firstName: dto.nombre,
    lastName: dto.apellido,
    fullName: `${dto.nombre} ${dto.apellido}`.trim(),
    birthDate: dto.fechaNacimiento,
    collaboratorPermission: dto.miPermiso,
  }
}

/** Sorted by last name, then first name. Does not mutate the input. */
export function toPatients(dtos: PacienteResponse[]): Patient[] {
  return dtos
    .map(toPatient)
    .sort((a, b) => a.lastName.localeCompare(b.lastName, 'es') || a.firstName.localeCompare(b.firstName, 'es'))
}
