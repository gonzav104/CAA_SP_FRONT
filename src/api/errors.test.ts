import { AxiosError } from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { describe, expect, it } from 'vitest'
import { getMaterializeErrorMessage, getReadErrorMessage, getWriteErrorMessage } from './errors'

function httpError(status: number): AxiosError {
  const config = { headers: {} } as InternalAxiosRequestConfig
  return new AxiosError('failed', 'ERR_BAD_REQUEST', config, null, {
    status,
    statusText: '',
    headers: {},
    config,
    data: { timestamp: 't', status, error: 'e', message: 'backend detail' },
  })
}

describe('getWriteErrorMessage', () => {
  it('maps network, 400 and 404 errors and never echoes the backend message', () => {
    expect(getWriteErrorMessage(new AxiosError('Network Error', 'ERR_NETWORK'))).toBe(
      'No se pudo conectar con el servidor.',
    )
    expect(getWriteErrorMessage(httpError(400))).toBe('El servidor rechazó los datos.')
    expect(getWriteErrorMessage(httpError(404))).toBe(
      'No tienes permiso para modificar esta cartilla o ya no existe.',
    )
    expect(getWriteErrorMessage(httpError(500))).toBe('Ocurrió un error inesperado.')
    expect(getWriteErrorMessage(new Error('boom'))).toBe('Ocurrió un error inesperado.')
  })
})

describe('getMaterializeErrorMessage', () => {
  it('maps network errors and everything else to neutral Spanish copy', () => {
    expect(getMaterializeErrorMessage(new AxiosError('Network Error', 'ERR_NETWORK'))).toBe(
      'No se pudo conectar con el servidor.',
    )
    expect(getMaterializeErrorMessage(httpError(400))).toBe('No se pudo registrar el pictograma elegido.')
    expect(getMaterializeErrorMessage(httpError(500))).toBe('No se pudo registrar el pictograma elegido.')
    expect(getMaterializeErrorMessage(new Error('boom'))).toBe('No se pudo registrar el pictograma elegido.')
  })
})

describe('getReadErrorMessage', () => {
  it('uses the given copy for 404', () => {
    expect(getReadErrorMessage(httpError(404), 'No existe.')).toBe('No existe.')
  })

  it('explains an invalid address for 400', () => {
    expect(getReadErrorMessage(httpError(400), 'x')).toBe('La dirección no es válida.')
  })

  it('explains connection problems for network errors', () => {
    expect(getReadErrorMessage(new AxiosError('Network Error', 'ERR_NETWORK'), 'x')).toBe(
      'No se pudo conectar con el servidor. Verifica tu conexión e intenta nuevamente.',
    )
  })

  it('falls back to a generic message and never echoes the backend message', () => {
    const message = getReadErrorMessage(httpError(500), 'x')
    expect(message).toBe('Ocurrió un error inesperado. Intenta nuevamente.')
    expect(message).not.toContain('backend detail')
    expect(getReadErrorMessage(new Error('boom'), 'x')).toBe('Ocurrió un error inesperado. Intenta nuevamente.')
  })
})
