import { describe, expect, it } from 'vitest'
import { paths, routes } from './paths'

describe('paths', () => {
  it('builds the list and detail paths', () => {
    expect(paths.dashboard()).toBe('/')
    expect(paths.patients()).toBe('/pacientes')
    expect(paths.boards('p1')).toBe('/pacientes/p1/cartillas')
    expect(paths.boardEditor('p1', 'c1')).toBe('/pacientes/p1/cartillas/c1/editor')
    expect(paths.boardUse('p1', 'c1')).toBe('/pacientes/p1/cartillas/c1/uso')
  })

  it('encodes ids', () => {
    expect(paths.boards('a/b?c')).toBe('/pacientes/a%2Fb%3Fc/cartillas')
    expect(paths.boardEditor('a b', 'c#d')).toBe('/pacientes/a%20b/cartillas/c%23d/editor')
    expect(paths.boardUse('a/b', 'c/d')).toBe('/pacientes/a%2Fb/cartillas/c%2Fd/uso')
  })

  it('keeps route patterns aligned with the builders', () => {
    expect(routes.boards).toBe('/pacientes/:pacienteId/cartillas')
    expect(routes.boardEditor).toBe('/pacientes/:pacienteId/cartillas/:cartillaId/editor')
    expect(routes.boardUse).toBe('/pacientes/:pacienteId/cartillas/:cartillaId/uso')
    expect(routes.login).toBe('/login')
    expect(routes.dashboard).toBe('/')
  })
})
