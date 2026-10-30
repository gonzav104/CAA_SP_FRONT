import { getApiErrorBody, getErrorStatus, isNetworkError } from '@/api/errors'

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

const NETWORK_MESSAGE = 'No se pudo conectar con el servidor. Verifica tu conexión e intenta nuevamente.'
const TOO_MANY_MESSAGE = 'Demasiados intentos. Espera unos minutos e intenta nuevamente.'
const UNEXPECTED_MESSAGE = 'Ocurrió un error inesperado. Intenta nuevamente.'
const MAX_ECHOED_MESSAGE_LENGTH = 160

/** The backend validation message (bean validation), only when it is short enough to be meaningful. */
function validationMessage(error: unknown, fallback: string): string {
  const message = getApiErrorBody(error)?.message.trim()
  return message && message.length <= MAX_ECHOED_MESSAGE_LENGTH ? message : fallback
}

// POST /api/usuarios/registro: 409 when the e-mail is already registered.
export function getRegisterErrorMessage(error: unknown): string {
  if (isNetworkError(error)) return NETWORK_MESSAGE
  switch (getErrorStatus(error)) {
    case 409:
      return 'Ya existe una cuenta con ese email. Inicia sesión o recupera tu contraseña.'
    case 400:
      return validationMessage(error, 'Revisa los datos ingresados.')
    case 429:
      return TOO_MANY_MESSAGE
    default:
      return UNEXPECTED_MESSAGE
  }
}

// POST /auth/olvide-password: always 200 when accepted, so only transport/limit errors reach here.
export function getPasswordResetRequestErrorMessage(error: unknown): string {
  if (isNetworkError(error)) return NETWORK_MESSAGE
  switch (getErrorStatus(error)) {
    case 400:
      return 'Ingresa un email válido.'
    case 429:
      return TOO_MANY_MESSAGE
    default:
      return UNEXPECTED_MESSAGE
  }
}

export const INVALID_RESET_LINK_MESSAGE = 'El enlace no es válido o ha expirado.'

// POST /auth/restablecer-password: an unknown, used or expired token is the same 404 on purpose.
export function getPasswordResetErrorMessage(error: unknown): string {
  if (isNetworkError(error)) return NETWORK_MESSAGE
  switch (getErrorStatus(error)) {
    case 404:
      return INVALID_RESET_LINK_MESSAGE
    case 400:
      return validationMessage(error, 'Revisa la nueva contraseña.')
    case 429:
      return TOO_MANY_MESSAGE
    default:
      return UNEXPECTED_MESSAGE
  }
}

// Every Google failure is the same 401 on purpose (invalid or unverified ID token, an e-mail that already
// has an account not linked to this Google identity, a conflicting subject): never guess which one.
export function getGoogleLoginErrorMessage(error: unknown): string {
  if (error instanceof SessionNotEstablishedError) {
    return 'No se pudo iniciar la sesión. Verifica que el navegador permita cookies.'
  }
  if (isNetworkError(error)) return NETWORK_MESSAGE
  switch (getErrorStatus(error)) {
    case 401:
      return 'No pudimos ingresar con esa cuenta de Google. Si ya tienes una cuenta con ese email, ingresa con tu contraseña o recupera el acceso con Google.'
    case 429:
      return TOO_MANY_MESSAGE
    default:
      return UNEXPECTED_MESSAGE
  }
}

// POST /auth/google/recuperacion/solicitar: same 200 for eligible or not; 401 only for an invalid ID token.
export function getGoogleRecoveryRequestErrorMessage(error: unknown): string {
  if (isNetworkError(error)) return NETWORK_MESSAGE
  switch (getErrorStatus(error)) {
    case 401:
      return 'No pudimos verificar esa cuenta de Google. Intenta nuevamente.'
    case 429:
      return TOO_MANY_MESSAGE
    default:
      return UNEXPECTED_MESSAGE
  }
}

// POST /auth/google/recuperacion/completar: an invalid, used or expired link, a Google account that does
// not match the one that asked for it, or reusing the current password are all the same 401.
export function getGoogleRecoveryErrorMessage(error: unknown): string {
  if (error instanceof SessionNotEstablishedError) {
    return 'No se pudo iniciar la sesión. Verifica que el navegador permita cookies.'
  }
  if (isNetworkError(error)) return NETWORK_MESSAGE
  switch (getErrorStatus(error)) {
    case 401:
      // The backend answers every cause with the same 401 on purpose, so the UI lists what to check. While the
      // link is still valid a rejection does not consume it: a different password can be tried again.
      return 'No se pudo recuperar el acceso. Verifica que la nueva contraseña sea distinta de la actual, que uses la misma cuenta de Google con la que pediste el enlace y que el enlace no esté vencido ni usado. Si el enlace sigue vigente, puedes intentarlo de nuevo con otra contraseña.'
    case 400:
      return validationMessage(error, 'Revisa la nueva contraseña.')
    case 429:
      return TOO_MANY_MESSAGE
    default:
      return UNEXPECTED_MESSAGE
  }
}
