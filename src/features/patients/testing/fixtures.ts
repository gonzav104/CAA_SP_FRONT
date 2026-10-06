import type { CurrentUser } from '@/features/auth/types'
import type { PacienteResponse } from '../apiTypes'

export const therapist: CurrentUser = {
  id: '3f0c8a52-6a53-4b86-9f7e-0b5b3c3f2f10',
  email: 'ana@example.com',
  nombre: 'Ana',
  rol: 'TERAPEUTA',
  creadoEn: '2026-01-01T10:00:00',
}

export const familyMember: CurrentUser = {
  id: '9a1d2c77-1b0e-4c5a-8f3e-2d6b7a4c9e01',
  email: 'rosa@example.com',
  nombre: 'Rosa',
  rol: 'FAMILIAR',
  creadoEn: '2026-01-02T10:00:00',
}

// Deliberately unsorted: the mapper must order by last name, then first name.
export const therapistPatientsResponse: PacienteResponse[] = [
  {
    id: 'p-3',
    nombre: 'Tomás',
    apellido: 'Pérez',
    fechaNacimiento: '2018-05-12',
    creadoEn: '2026-02-01T09:00:00',
    miPermiso: null,
    gridSize: 6,
  },
  {
    id: 'p-1',
    nombre: 'Bruno',
    apellido: 'Álvarez',
    fechaNacimiento: '2019-11-03',
    creadoEn: '2026-02-02T09:00:00',
    miPermiso: null,
    gridSize: null,
  },
  {
    id: 'p-2',
    nombre: 'Alma',
    apellido: 'Pérez',
    fechaNacimiento: '2020-01-30',
    creadoEn: '2026-02-03T09:00:00',
    miPermiso: null,
    gridSize: 9,
  },
]

export const familyPatientsResponse: PacienteResponse[] = [
  {
    id: 'p-10',
    nombre: 'Lola',
    apellido: 'Gómez',
    fechaNacimiento: '2017-03-08',
    creadoEn: '2026-02-01T09:00:00',
    miPermiso: 'LECTURA',
    gridSize: 6,
  },
  {
    id: 'p-11',
    nombre: 'Teo',
    apellido: 'Gómez',
    fechaNacimiento: '2016-07-21',
    creadoEn: '2026-02-01T10:00:00',
    miPermiso: 'EDICION_LIMITADA',
    gridSize: null,
  },
]
