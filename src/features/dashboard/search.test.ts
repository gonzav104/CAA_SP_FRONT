import { describe, expect, it } from 'vitest'
import type { Patient } from '@/features/patients/types'
import { filterPatients } from './search'

function patient(firstName: string, lastName: string): Patient {
  return { id: `${firstName}-${lastName}`, firstName, lastName, fullName: `${firstName} ${lastName}`, birthDate: '2020-01-01', collaboratorPermission: null }
}

const patients: Patient[] = [patient('Tomás', 'Pérez'), patient('Bruno', 'Álvarez'), patient('Alma', 'Pérez')]

describe('filterPatients', () => {
  it('returns everyone for a blank query', () => {
    expect(filterPatients(patients, '')).toEqual(patients)
    expect(filterPatients(patients, '   ')).toEqual(patients)
  })

  it('matches by first name or last name, case-insensitively', () => {
    expect(filterPatients(patients, 'tomas').map((p) => p.firstName)).toEqual(['Tomás'])
    expect(filterPatients(patients, 'PÉREZ').map((p) => p.firstName)).toEqual(['Tomás', 'Alma'])
  })

  it('matches diacritic-insensitively', () => {
    expect(filterPatients(patients, 'alvarez').map((p) => p.firstName)).toEqual(['Bruno'])
  })

  it('matches partial text', () => {
    expect(filterPatients(patients, 'al').map((p) => p.firstName)).toEqual(['Bruno', 'Alma'])
  })

  it('returns nothing when there is no match', () => {
    expect(filterPatients(patients, 'zzz')).toEqual([])
  })
})
