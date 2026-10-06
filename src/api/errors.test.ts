import { AxiosError } from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { describe, expect, it } from 'vitest'
import { getReadErrorMessage } from './errors'

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
