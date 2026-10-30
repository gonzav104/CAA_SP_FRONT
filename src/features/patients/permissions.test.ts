import { describe, expect, it } from 'vitest'
import { canCreateBoard, canDeleteBoard, canEditBoard, canSetPrimaryBoard } from '@/features/boards/permissions'
import { canDeleteCustomPictogram, canEditCustomPictograms } from '@/features/customPictograms/permissions'
import { canCreatePatient } from '@/features/organizations/permissions'
import {
  canAccessCollaborators,
  canAccessSessions,
  canDeletePatient,
  canEditPatientData,
} from './permissions'
import type { Capability } from './apiTypes'
import type { Patient } from './types'

function patientWith(capabilities: Capability[], collaboratorPermission: Patient['collaboratorPermission'] = null): Patient {
  return {
    id: 'p-1',
    firstName: 'Tomás',
    lastName: 'Pérez',
    fullName: 'Tomás Pérez',
    birthDate: '2018-05-12',
    organizationId: 'org-1',
    collaboratorPermission,
    capabilities,
    gridSize: null,
  }
}

const ownerOrAdmin = patientWith(['EDITAR_CONTENIDO', 'GESTION_CLINICA', 'ADMINISTRAR'])
const assignedTherapist = patientWith(['EDITAR_CONTENIDO', 'GESTION_CLINICA'])
const limitedFamily = patientWith(['EDITAR_CONTENIDO'], 'EDICION_LIMITADA')
const readOnlyFamily = patientWith([], 'LECTURA')

describe('patient permissions', () => {
  it.each([
    ['OWNER/ADMIN', ownerOrAdmin, { edit: true, remove: true, clinical: true }],
    ['assigned therapist', assignedTherapist, { edit: true, remove: false, clinical: true }],
    ['family EDICION_LIMITADA', limitedFamily, { edit: true, remove: false, clinical: false }],
    ['family LECTURA', readOnlyFamily, { edit: false, remove: false, clinical: false }],
  ])('%s', (_label, patient, expected) => {
    expect(canEditPatientData(patient)).toBe(expected.edit)
    expect(canDeletePatient(patient)).toBe(expected.remove)
    expect(canAccessSessions(patient)).toBe(expected.clinical)
    expect(canAccessCollaborators(patient)).toBe(expected.clinical)
    expect(canCreateBoard(patient)).toBe(expected.edit)
    expect(canEditBoard(patient)).toBe(expected.edit)
    expect(canEditCustomPictograms(patient)).toBe(expected.edit)
    expect(canDeleteBoard(patient)).toBe(expected.clinical)
    expect(canDeleteCustomPictogram(patient)).toBe(expected.clinical)
    expect(canSetPrimaryBoard(patient, { isPrimary: false })).toBe(expected.clinical)
  })

  it('never offers marking the principal cartilla again', () => {
    expect(canSetPrimaryBoard(ownerOrAdmin, { isPrimary: true })).toBe(false)
  })

  it('grants nothing with empty capabilities, whatever the collaborator permission says', () => {
    for (const patient of [patientWith([]), patientWith([], 'EDICION_LIMITADA')]) {
      expect(canEditPatientData(patient)).toBe(false)
      expect(canAccessSessions(patient)).toBe(false)
      expect(canEditBoard(patient)).toBe(false)
    }
  })

  it('grants nothing while the patient is not loaded', () => {
    for (const patient of [null, undefined]) {
      expect(canEditPatientData(patient)).toBe(false)
      expect(canDeletePatient(patient)).toBe(false)
      expect(canAccessSessions(patient)).toBe(false)
      expect(canCreateBoard(patient)).toBe(false)
      expect(canSetPrimaryBoard(patient, { isPrimary: false })).toBe(false)
    }
  })
})

describe('canCreatePatient', () => {
  const org = { id: 'org-1', nombre: 'Centro', miRolGestion: 'MIEMBRO' as const, miEsTerapeuta: false }

  it.each([
    ['OWNER', { ...org, miRolGestion: 'OWNER' as const }, true],
    ['ADMIN', { ...org, miRolGestion: 'ADMIN' as const }, true],
    ['therapist member', { ...org, miEsTerapeuta: true }, true],
    ['plain member', org, false],
  ])('%s', (_label, organization, expected) => {
    expect(canCreatePatient([organization])).toBe(expected)
  })

  it('is false for a family-only user without organizations, or while they load', () => {
    expect(canCreatePatient([])).toBe(false)
    expect(canCreatePatient(undefined)).toBe(false)
  })
})
