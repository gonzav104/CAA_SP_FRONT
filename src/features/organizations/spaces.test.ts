import { describe, expect, it } from 'vitest'
import { toPatients } from '@/features/patients/mappers'
import { familyPatientsResponse, therapistPatientsResponse } from '@/features/patients/testing/fixtures'
import { membershipLabel, patientsInSpace, resolveSpace, sharedPatients } from './spaces'
import { adminOrganization, ownerOrganization, plainMemberOrganization } from './testing/fixtures'

const patients = toPatients([...therapistPatientsResponse, ...familyPatientsResponse])

describe('spaces', () => {
  it('labels the management role and adds the clinical one when it applies', () => {
    expect(membershipLabel(ownerOrganization)).toBe('Propietario · Terapeuta')
    expect(membershipLabel(adminOrganization)).toBe('Administrador')
    expect(membershipLabel(plainMemberOrganization)).toBe('Miembro')
  })

  it('resolves the URL space against the current memberships only', () => {
    expect(resolveSpace(null, [ownerOrganization])).toEqual({ space: { kind: 'all' }, stale: false })
    expect(resolveSpace('compartidos', [])).toEqual({ space: { kind: 'shared' }, stale: false })
    expect(resolveSpace('org-1', [ownerOrganization])).toEqual({
      space: { kind: 'organization', organization: ownerOrganization },
      stale: false,
    })
    // A membership that no longer exists is never trusted from the URL.
    expect(resolveSpace('org-gone', [ownerOrganization])).toEqual({ space: { kind: 'all' }, stale: true })
    expect(resolveSpace('org-1', undefined)).toEqual({ space: { kind: 'all' }, stale: false })
  })

  it('splits clinical-team patients of an organization from the family-shared ones', () => {
    const inOrganization = patientsInSpace(patients, { kind: 'organization', organization: ownerOrganization })
    expect(inOrganization.map((p) => p.id).sort()).toEqual(['p-1', 'p-2', 'p-3'])
    expect(sharedPatients(patients).map((p) => p.id).sort()).toEqual(['p-10', 'p-11'])
    expect(patientsInSpace(patients, { kind: 'all' })).toHaveLength(5)
  })
})
