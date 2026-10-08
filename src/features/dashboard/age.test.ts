import { describe, expect, it } from 'vitest'
import { ageFrom } from './age'

describe('ageFrom', () => {
  it('counts a birthday already reached this year', () => {
    expect(ageFrom('2018-05-12', new Date(2026, 4, 12))).toBe(8)
    expect(ageFrom('2018-05-12', new Date(2026, 9, 1))).toBe(8)
  })

  it('does not count a birthday still to come this year', () => {
    expect(ageFrom('2018-05-12', new Date(2026, 4, 11))).toBe(7)
    expect(ageFrom('2018-05-12', new Date(2026, 0, 1))).toBe(7)
  })

  it('returns null for a malformed date', () => {
    expect(ageFrom('not-a-date', new Date())).toBeNull()
  })
})
