import { describe, expect, it } from 'vitest'
import { PASSWORD_REQUIREMENTS, strongPassword } from './password'

const metIds = (password: string) =>
  PASSWORD_REQUIREMENTS.filter((requirement) => requirement.isMet(password)).map((requirement) => requirement.id)

describe('password requirements', () => {
  it.each([
    ['Segura#2026', ['length', 'case', 'digit', 'symbol']],
    ['', []],
    ['segura#2026', ['length', 'digit', 'symbol']],
    ['SEGURA#2026', ['length', 'digit', 'symbol']],
    ['Segura#abc', ['length', 'case', 'symbol']],
    ['Segura2026', ['length', 'case', 'digit']],
    ['Sg#2026', ['case', 'digit', 'symbol']],
    // "ñ" is a letter, not a symbol; a space is a symbol (anything that is neither a letter nor a digit).
    ['Contraseña2026', ['length', 'case', 'digit']],
    ['Mi clave 2026', ['length', 'case', 'digit', 'symbol']],
  ])('%j meets %j', (password, expected) => {
    expect(metIds(password)).toEqual(expected)
  })

  it.each([
    'Segura#2026',
    'Mi clave 2026',
    'Ñandú#2026x',
    'segura#2026',
    'SEGURA#2026',
    'Segura#abc',
    'Segura2026',
    'Sg#2026',
    'Contraseña2026',
    'Ññññ#2026',
    '12345678',
    '',
  ])('meeting every requirement is exactly what the schema (and the backend @Pattern) accepts: %j', (password) => {
    const allMet = PASSWORD_REQUIREMENTS.every((requirement) => requirement.isMet(password))
    expect(allMet).toBe(strongPassword.safeParse(password).success)
  })
})
