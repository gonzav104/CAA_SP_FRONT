import { getErrorStatus, isNetworkError } from '@/api/errors'

export class SessionNotEstablishedError extends Error {
  constructor() {
    super('Login succeeded but the session cookie did not authenticate the user')
    this.name = 'SessionNotEstablishedError'
  }
}

export function getLoginErrorMessage(error: unknown): string {
  if (error instanceof SessionNotEstablishedError) {
    return 'No se pudo iniciar la sesión. Verifica que el navegador permita cookies.'
  }
  if (isNetworkError(error)) {
    return 'No se pudo conectar con el servidor. Verifica tu conexión e intenta nuevamente.'
  }
  switch (getErrorStatus(error)) {
    case 401:
      return 'Email o contraseña incorrectos.'
    case 429:
      return 'Demasiados intentos. Espera unos minutos e intenta nuevamente.'
    case 400:
      return 'Revisa el email y la contraseña.'
    default:
      return 'Ocurrió un error inesperado. Intenta nuevamente.'
  }
}
