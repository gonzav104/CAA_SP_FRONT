import { describe, expect, it } from 'vitest'
import { getReturnTo, pendingFrom } from './returnTo'

describe('getReturnTo', () => {
  it('returns the internal path and its history state', () => {
    const state = { from: { pathname: '/invitaciones/aceptar', state: { invitationToken: 't' } } }
    expect(getReturnTo(state)).toEqual({ pathname: '/invitaciones/aceptar', state: { invitationToken: 't' } })
  })

  it('keeps the query string of the internal destination (e.g. the active space)', () => {
    expect(getReturnTo({ from: { pathname: '/pacientes', search: '?espacio=org-1' } })).toEqual({
      pathname: '/pacientes?espacio=org-1',
      state: undefined,
    })
    expect(getReturnTo({ from: { pathname: '/pacientes', search: '//evil.example' } }).pathname).toBe('/pacientes')
  })

  it.each([
    ['an absolute URL', 'https://evil.example/phish'],
    ['a protocol-relative URL', '//evil.example'],
    ['a backslash trick', '/\\evil.example'],
    ['a javascript: URL', 'javascript:alert(1)'],
    ['the login page itself', '/login'],
    ['the registration page', '/registro'],
    ['a non-string', 42],
  ])('never redirects to %s', (_label, pathname) => {
    expect(getReturnTo({ from: { pathname } })).toEqual({ pathname: '/' })
  })

  it('falls back to the dashboard without a pending destination', () => {
    expect(getReturnTo(null)).toEqual({ pathname: '/' })
    expect(getReturnTo({})).toEqual({ pathname: '/' })
  })
})

describe('pendingFrom', () => {
  it('hands the pending `from` over unchanged, or undefined', () => {
    const from = { pathname: '/x' }
    expect(pendingFrom({ from })).toBe(from)
    expect(pendingFrom(undefined)).toBeUndefined()
  })
})
