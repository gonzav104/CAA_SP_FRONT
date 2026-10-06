import { AxiosError } from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { describe, expect, it } from 'vitest'
import {
  getCategoryErrorMessage,
  getCreateErrorMessage,
  getDeleteErrorMessage,
  getMaterializeErrorMessage,
  getReadErrorMessage,
  getWriteErrorMessage,
} from './errors'

function httpError(status: number, message: unknown = 'backend detail'): AxiosError {
  const config = { headers: {} } as InternalAxiosRequestConfig
  return new AxiosError('failed', 'ERR_BAD_REQUEST', config, null, {
    status,
    statusText: '',
    headers: {},
    config,
    data: { timestamp: 't', status, error: 'e', message },
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

describe('getCreateErrorMessage', () => {
  const network = new AxiosError('Network Error', 'ERR_NETWORK')

  it('maps the pictogram and reload stages regardless of the cause', () => {
    expect(getCreateErrorMessage(network, 'pictogram')).toBe('No se pudo registrar el pictograma elegido.')
    expect(getCreateErrorMessage(httpError(400), 'pictogram')).toBe('No se pudo registrar el pictograma elegido.')
    expect(getCreateErrorMessage(network, 'reload')).toBe(
      'La tarjeta se creó, pero no se pudo recargar la cartilla. Recarga la página.',
    )
  })

  it('maps the request stage by failure kind', () => {
    expect(getCreateErrorMessage(network, 'request')).toBe('No se pudo conectar con el servidor.')
    expect(getCreateErrorMessage(httpError(404), 'request')).toBe(
      'No tienes permiso para modificar esta cartilla o la categoría ya no existe.',
    )
    expect(getCreateErrorMessage(httpError(409), 'request')).toBe('La operación entra en conflicto con datos existentes.')
    expect(getCreateErrorMessage(httpError(500), 'request')).toBe('Ocurrió un error inesperado.')
    expect(getCreateErrorMessage(new Error('boom'), 'request')).toBe('Ocurrió un error inesperado.')
  })

  it('echoes a short 400 message and falls back when it is missing or too long', () => {
    expect(getCreateErrorMessage(httpError(400, 'Falta el texto'), 'request')).toBe(
      'El servidor rechazó los datos: Falta el texto',
    )
    expect(getCreateErrorMessage(httpError(400, 'x'.repeat(200)), 'request')).toBe(
      `El servidor rechazó los datos: ${'x'.repeat(200)}`,
    )
    expect(getCreateErrorMessage(httpError(400, 'x'.repeat(201)), 'request')).toBe('El servidor rechazó los datos.')
    expect(getCreateErrorMessage(httpError(400, 42), 'request')).toBe('El servidor rechazó los datos.')
    expect(getCreateErrorMessage(httpError(400, '   '), 'request')).toBe('El servidor rechazó los datos.')
  })
})

describe('getDeleteErrorMessage', () => {
  it('maps the reload stage', () => {
    expect(getDeleteErrorMessage(new Error('boom'), 'reload')).toBe(
      'La tarjeta se eliminó, pero no se pudo recargar la cartilla. Recarga la página.',
    )
  })

  it('maps the request stage by failure kind', () => {
    expect(getDeleteErrorMessage(new AxiosError('Network Error', 'ERR_NETWORK'), 'request')).toBe(
      'No se pudo conectar con el servidor.',
    )
    expect(getDeleteErrorMessage(httpError(400, 'Dato inválido'), 'request')).toBe(
      'El servidor rechazó los datos: Dato inválido',
    )
    expect(getDeleteErrorMessage(httpError(404), 'request')).toBe(
      'La tarjeta ya no existe o no tienes permiso para eliminarla.',
    )
    expect(getDeleteErrorMessage(httpError(409), 'request')).toBe('La operación entra en conflicto con datos existentes.')
    expect(getDeleteErrorMessage(httpError(500), 'request')).toBe('Ocurrió un error inesperado.')
  })
})

describe('getCategoryErrorMessage', () => {
  const network = new AxiosError('Network Error', 'ERR_NETWORK')
  const operations = ['create', 'rename', 'move', 'delete'] as const

  it('maps the reload stage for every operation regardless of the cause', () => {
    for (const operation of operations) {
      expect(getCategoryErrorMessage(network, 'reload', operation)).toBe(
        'El cambio se guardó, pero no se pudo recargar la cartilla. Recarga la página.',
      )
    }
  })

  it('maps the request stage by failure kind for create, rename and delete', () => {
    for (const operation of ['create', 'rename', 'delete'] as const) {
      expect(getCategoryErrorMessage(network, 'request', operation)).toBe('No se pudo conectar con el servidor.')
      expect(getCategoryErrorMessage(httpError(400, 'Nombre inválido'), 'request', operation)).toBe(
        'El servidor rechazó los datos: Nombre inválido',
      )
      expect(getCategoryErrorMessage(httpError(400, 'x'.repeat(201)), 'request', operation)).toBe('El servidor rechazó los datos.')
      expect(getCategoryErrorMessage(httpError(400, 42), 'request', operation)).toBe('El servidor rechazó los datos.')
      expect(getCategoryErrorMessage(httpError(404), 'request', operation)).toBe(
        'No tienes permiso para modificar esta cartilla o la categoría ya no existe.',
      )
      expect(getCategoryErrorMessage(httpError(409), 'request', operation)).toBe(
        'La operación entra en conflicto con datos existentes.',
      )
      expect(getCategoryErrorMessage(httpError(500), 'request', operation)).toBe('Ocurrió un error inesperado.')
      expect(getCategoryErrorMessage(new Error('boom'), 'request', operation)).toBe('Ocurrió un error inesperado.')
    }
  })

  it('prefixes move request failures', () => {
    expect(getCategoryErrorMessage(network, 'request', 'move')).toBe(
      'No se pudo mover la categoría. No se pudo conectar con el servidor.',
    )
    expect(getCategoryErrorMessage(httpError(404), 'request', 'move')).toBe(
      'No se pudo mover la categoría. No tienes permiso para modificar esta cartilla o la categoría ya no existe.',
    )
    expect(getCategoryErrorMessage(httpError(409), 'request', 'move')).toBe(
      'No se pudo mover la categoría. La operación entra en conflicto con datos existentes.',
    )
    expect(getCategoryErrorMessage(httpError(500), 'request', 'move')).toBe(
      'No se pudo mover la categoría. Ocurrió un error inesperado.',
    )
  })
})
