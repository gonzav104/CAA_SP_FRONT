import { describe, expect, it } from 'vitest'
import { formatBirthDate } from './format'
import { toPatient, toPatients } from './mappers'
import { familyPatientsResponse, therapistPatientsResponse } from './testing/fixtures'

describe('patients mappers', () => {
  it('maps a DTO to a Patient', () => {
    expect(toPatient(familyPatientsResponse[1])).toEqual({
      id: 'p-11',
      firstName: 'Teo',
      lastName: 'Gómez',
      fullName: 'Teo Gómez',
      birthDate: '2016-07-21',
      collaboratorPermission: 'EDICION_LIMITADA',
      gridSize: null,
    })
  })

  it('trims the full name and keeps a null permission for therapists', () => {
    const patient = toPatient({ ...therapistPatientsResponse[0], nombre: 'Ana', apellido: '' })
    expect(patient.fullName).toBe('Ana')
    expect(patient.collaboratorPermission).toBeNull()
  })

  it('sorts by last name then first name without mutating the input', () => {
    const input = [...therapistPatientsResponse]
    const result = toPatients(input)
    expect(result.map((p) => p.id)).toEqual(['p-1', 'p-2', 'p-3'])
    expect(input).toEqual(therapistPatientsResponse)
  })
})

describe('formatBirthDate', () => {
  it('formats ISO dates as dd/mm/yyyy', () => {
    expect(formatBirthDate('2018-05-12')).toBe('12/05/2018')
  })

  it('returns invalid input unchanged', () => {
    expect(formatBirthDate('12/05/2018')).toBe('12/05/2018')
    expect(formatBirthDate('')).toBe('')
    expect(formatBirthDate('2018-5-1')).toBe('2018-5-1')
  })
})
