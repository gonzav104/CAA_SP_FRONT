import { AxiosError } from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { describe, expect, it } from 'vitest'
import { SessionNotEstablishedError, getLoginErrorMessage } from './errors'

function httpError(status: number): AxiosError {
  const config = { headers: {} } as InternalAxiosRequestConfig
  return new AxiosError('failed', 'ERR_BAD_REQUEST', config, null, {
    status,
    statusText: '',
    headers: {},
    config,
    data: { message: 'backend message that must not be echoed' },
  })
}

describe('getLoginErrorMessage', () => {
  it('maps 401', () => {
    expect(getLoginErrorMessage(httpError(401))).toBe('Email o contraseña incorrectos.')
  })

  it('maps 429', () => {
    expect(getLoginErrorMessage(httpError(429))).toBe(
      'Demasiados intentos. Espera unos minutos e intenta nuevamente.',
    )
  })

  it('maps 400', () => {
    expect(getLoginErrorMessage(httpError(400))).toBe('Revisa el email y la contraseña.')
  })

  it('maps network errors', () => {
    expect(getLoginErrorMessage(new AxiosError('Network Error', 'ERR_NETWORK'))).toBe(
      'No se pudo conectar con el servidor. Verifica tu conexión e intenta nuevamente.',
    )
  })

  it('maps SessionNotEstablishedError', () => {
    expect(getLoginErrorMessage(new SessionNotEstablishedError())).toBe(
      'No se pudo iniciar la sesión. Verifica que el navegador permita cookies.',
    )
  })

  it('maps anything else without echoing backend messages', () => {
    expect(getLoginErrorMessage(httpError(500))).toBe('Ocurrió un error inesperado. Intenta nuevamente.')
    expect(getLoginErrorMessage(new Error('boom'))).toBe('Ocurrió un error inesperado. Intenta nuevamente.')
    expect(getLoginErrorMessage(undefined)).toBe('Ocurrió un error inesperado. Intenta nuevamente.')
  })
})
