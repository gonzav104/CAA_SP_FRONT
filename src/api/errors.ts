import axios from 'axios'
import type { ApiErrorBody } from './types'

export function getErrorStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined
}

export function isUnauthorized(error: unknown): boolean {
  return getErrorStatus(error) === 401
}

export function isNetworkError(error: unknown): boolean {
  return axios.isAxiosError(error) && !error.response
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== 'object' || value === null) return false
  const body = value as Record<string, unknown>
  return (
    typeof body.timestamp === 'string' &&
    typeof body.status === 'number' &&
    typeof body.error === 'string' &&
    typeof body.message === 'string'
  )
}

export function getApiErrorBody(error: unknown): ApiErrorBody | undefined {
  if (!axios.isAxiosError(error)) return undefined
  const data: unknown = error.response?.data
  return isApiErrorBody(data) ? data : undefined
}

// User-facing copy for failed write (PUT) requests. Backend `message` strings are never echoed.
export function getWriteErrorMessage(error: unknown): string {
  if (isNetworkError(error)) return 'No se pudo conectar con el servidor.'
  const status = getErrorStatus(error)
  if (status === 400) return 'El servidor rechazó los datos.'
  if (status === 404) return 'No tienes permiso para modificar esta cartilla o ya no existe.'
  return 'Ocurrió un error inesperado.'
}

// User-facing copy for a failed pictogram registration (POST materializar). Backend `message` strings are never echoed.
export function getMaterializeErrorMessage(error: unknown): string {
  if (isNetworkError(error)) return 'No se pudo conectar con el servidor.'
  return 'No se pudo registrar el pictograma elegido.'
}

// User-facing copy for failed GET requests. Backend `message` strings are never echoed.
export function getReadErrorMessage(error: unknown, notFoundMessage: string): string {
  const status = getErrorStatus(error)
  if (status === 404) return notFoundMessage
  if (status === 400) return 'La dirección no es válida.'
  if (isNetworkError(error)) {
    return 'No se pudo conectar con el servidor. Verifica tu conexión e intenta nuevamente.'
  }
  return 'Ocurrió un error inesperado. Intenta nuevamente.'
}
