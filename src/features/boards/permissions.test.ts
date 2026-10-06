import { describe, expect, it } from 'vitest'
import type { CurrentUser } from '@/features/auth/types'
import { familyMember, therapist } from '@/features/patients/testing/fixtures'
import type { Patient } from '@/features/patients/types'
import { canCreateBoard, canEditBoard, canSetPrimaryBoard, isResponsibleTherapist } from './permissions'

const ownPatient: Patient = {
  id: 'p-1',
  firstName: 'Tomás',
  lastName: 'Pérez',
  fullName: 'Tomás Pérez',
  birthDate: '2018-05-12',
  collaboratorPermission: null,
}
const limitedPatient: Patient = { ...ownPatient, collaboratorPermission: 'EDICION_LIMITADA' }
const readOnlyPatient: Patient = { ...ownPatient, collaboratorPermission: 'LECTURA' }
const foreignTherapist: CurrentUser = { ...therapist, id: 'other-therapist' }

describe('canEditBoard', () => {
  it('allows only the creator', () => {
    expect(canEditBoard(therapist, therapist.id)).toBe(true)
    expect(canEditBoard(familyMember, therapist.id)).toBe(false)
  })

  it('denies when there is no user', () => {
    expect(canEditBoard(null, therapist.id)).toBe(false)
    expect(canEditBoard(undefined, therapist.id)).toBe(false)
  })
})

describe('isResponsibleTherapist', () => {
  it('is true only for a therapist who is not a collaborator of the patient', () => {
    expect(isResponsibleTherapist(therapist, ownPatient)).toBe(true)
    expect(isResponsibleTherapist(familyMember, ownPatient)).toBe(false)
    expect(isResponsibleTherapist(familyMember, limitedPatient)).toBe(false)
    expect(isResponsibleTherapist(familyMember, readOnlyPatient)).toBe(false)
  })

  it('is false while the user or the patient is not loaded', () => {
    expect(isResponsibleTherapist(null, ownPatient)).toBe(false)
    expect(isResponsibleTherapist(undefined, ownPatient)).toBe(false)
    expect(isResponsibleTherapist(therapist, undefined)).toBe(false)
    expect(isResponsibleTherapist(null, undefined)).toBe(false)
  })
})

describe('canCreateBoard', () => {
  it('allows the responsible therapist and a familiar with limited edition', () => {
    expect(canCreateBoard(therapist, ownPatient)).toBe(true)
    expect(canCreateBoard(familyMember, limitedPatient)).toBe(true)
  })

  it('denies a read-only familiar', () => {
    expect(canCreateBoard(familyMember, readOnlyPatient)).toBe(false)
  })

  it('denies while the user or the patient is not loaded', () => {
    expect(canCreateBoard(null, ownPatient)).toBe(false)
    expect(canCreateBoard(undefined, limitedPatient)).toBe(false)
    expect(canCreateBoard(therapist, undefined)).toBe(false)
    expect(canCreateBoard(null, null)).toBe(false)
  })
})

describe('canSetPrimaryBoard', () => {
  it('allows the responsible therapist on a non-principal cartilla whoever created it', () => {
    expect(canSetPrimaryBoard(therapist, ownPatient, { isPrimary: false })).toBe(true)
    expect(canSetPrimaryBoard(foreignTherapist, { ...ownPatient }, { isPrimary: false })).toBe(true)
  })

  it('denies on the principal cartilla', () => {
    expect(canSetPrimaryBoard(therapist, ownPatient, { isPrimary: true })).toBe(false)
  })

  it('denies every familiar, whatever the permission', () => {
    expect(canSetPrimaryBoard(familyMember, limitedPatient, { isPrimary: false })).toBe(false)
    expect(canSetPrimaryBoard(familyMember, readOnlyPatient, { isPrimary: false })).toBe(false)
  })

  it('denies while the user or the patient is not loaded', () => {
    expect(canSetPrimaryBoard(null, ownPatient, { isPrimary: false })).toBe(false)
    expect(canSetPrimaryBoard(therapist, undefined, { isPrimary: false })).toBe(false)
  })
})
