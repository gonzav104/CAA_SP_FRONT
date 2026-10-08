import { describe, expect, it } from 'vitest'
import { greetingFor } from './greeting'

describe('greetingFor', () => {
  it('greets good morning before 13:00', () => {
    expect(greetingFor(new Date(2026, 0, 1, 8, 0))).toBe('Buenos días')
    expect(greetingFor(new Date(2026, 0, 1, 12, 59))).toBe('Buenos días')
  })

  it('greets good afternoon from 13:00 to before 20:00', () => {
    expect(greetingFor(new Date(2026, 0, 1, 13, 0))).toBe('Buenas tardes')
    expect(greetingFor(new Date(2026, 0, 1, 19, 59))).toBe('Buenas tardes')
  })

  it('greets good night from 20:00 and before 6:00', () => {
    expect(greetingFor(new Date(2026, 0, 1, 20, 0))).toBe('Buenas noches')
    expect(greetingFor(new Date(2026, 0, 1, 23, 59))).toBe('Buenas noches')
    expect(greetingFor(new Date(2026, 0, 1, 0, 0))).toBe('Buenas noches')
    expect(greetingFor(new Date(2026, 0, 1, 5, 59))).toBe('Buenas noches')
  })
})
