import { describe, expect, it } from 'vitest'
import { familyMember, therapist } from '@/features/patients/testing/fixtures'
import { canEditBoard } from './permissions'

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
