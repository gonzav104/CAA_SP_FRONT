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

const MAX_ECHOED_MESSAGE_LENGTH = 200

// Shared by the create/delete copy: network, 400 (echoing a short backend message), 409 and the fallback.
// Returns undefined for 404, whose copy depends on the operation.
function getItemRequestErrorMessage(error: unknown): string | undefined {
  if (isNetworkError(error)) return 'No se pudo conectar con el servidor.'
  const status = getErrorStatus(error)
  if (status === 400) {
    const message = getApiErrorBody(error)?.message.trim()
    return message && message.length <= MAX_ECHOED_MESSAGE_LENGTH
      ? `El servidor rechazó los datos: ${message}`
      : 'El servidor rechazó los datos.'
  }
  if (status === 409) return 'La operación entra en conflicto con datos existentes.'
  if (status === 404) return undefined
  return 'Ocurrió un error inesperado.'
}

// User-facing copy for a failed item creation (pictogram registration, POST item, or reload).
export function getCreateErrorMessage(error: unknown, stage: 'pictogram' | 'request' | 'reload'): string {
  if (stage === 'pictogram') return 'No se pudo registrar el pictograma elegido.'
  if (stage === 'reload') return 'La tarjeta se creó, pero no se pudo recargar la cartilla. Recarga la página.'
  return (
    getItemRequestErrorMessage(error) ??
    'No tienes permiso para modificar esta cartilla o la categoría ya no existe.'
  )
}

// User-facing copy for a failed item deletion (DELETE, or reload).
export function getDeleteErrorMessage(error: unknown, stage: 'request' | 'reload'): string {
  if (stage === 'reload') return 'La tarjeta se eliminó, pero no se pudo recargar la cartilla. Recarga la página.'
  return getItemRequestErrorMessage(error) ?? 'La tarjeta ya no existe o no tienes permiso para eliminarla.'
}

// User-facing copy for a failed category operation (POST/PUT/DELETE, or reload).
export function getCategoryErrorMessage(
  error: unknown,
  stage: 'request' | 'reload',
  operation: 'create' | 'rename' | 'move' | 'delete',
): string {
  if (stage === 'reload') return 'El cambio se guardó, pero no se pudo recargar la cartilla. Recarga la página.'
  const message =
    getItemRequestErrorMessage(error) ??
    'No tienes permiso para modificar esta cartilla o la categoría ya no existe.'
  return operation === 'move' ? `No se pudo mover la categoría. ${message}` : message
}

// User-facing copy for a failed cartilla operation (POST/PUT/DELETE, or the list reload that follows).
export function getCartillaErrorMessage(
  error: unknown,
  stage: 'request' | 'reload',
  operation: 'create' | 'rename' | 'primary' | 'delete',
): string {
  if (stage === 'reload') return 'El cambio se guardó, pero no se pudo actualizar la lista.'
  if (isNetworkError(error)) return 'No se pudo conectar con el servidor.'
  const status = getErrorStatus(error)
  if (status === 400) {
    const message = getApiErrorBody(error)?.message.trim()
    return message && message.length <= MAX_ECHOED_MESSAGE_LENGTH
      ? `El servidor rechazó los datos: ${message}`
      : 'El servidor rechazó los datos.'
  }
  if (status === 403) {
    return operation === 'primary'
      ? 'Solo el terapeuta responsable del paciente puede cambiar la cartilla principal.'
      : 'No tienes permiso para hacer este cambio.'
  }
  if (status === 404) {
    if (operation === 'create') return 'No tienes permiso para crear cartillas para este paciente.'
    if (operation === 'primary') return 'La cartilla ya no existe o no tienes acceso.'
    return 'La cartilla ya no existe o no tienes permiso para modificarla.'
  }
  if (status === 409) {
    return operation === 'primary'
      ? 'La cartilla principal cambió mientras hacías el cambio. Se actualizó la lista con la información actual.'
      : 'La operación entra en conflicto con datos existentes.'
  }
  return 'Ocurrió un error inesperado.'
}

// User-facing copy for a failed patient creation (POST /api/pacientes).
export function getPatientCreateErrorMessage(error: unknown): string {
  if (isNetworkError(error)) return 'No se pudo conectar con el servidor.'
  const status = getErrorStatus(error)
  if (status === 400) {
    const message = getApiErrorBody(error)?.message.trim()
    return message && message.length <= MAX_ECHOED_MESSAGE_LENGTH
      ? `El servidor rechazó los datos: ${message}`
      : 'El servidor rechazó los datos.'
  }
  if (status === 403) return 'Solo un terapeuta puede registrar un paciente.'
  return 'Ocurrió un error inesperado.'
}

// User-facing copy for a failed patient update (PUT /api/pacientes/{id}). Mirrors
// PacienteServiceImpl.actualizarPaciente: ownership failure is a plain 404, not a 403.
export function getPatientUpdateErrorMessage(error: unknown): string {
  if (isNetworkError(error)) return 'No se pudo conectar con el servidor.'
  const status = getErrorStatus(error)
  if (status === 400) {
    const message = getApiErrorBody(error)?.message.trim()
    return message && message.length <= MAX_ECHOED_MESSAGE_LENGTH
      ? `El servidor rechazó los datos: ${message}`
      : 'El servidor rechazó los datos.'
  }
  if (status === 404) return 'No eres el terapeuta responsable de este paciente, o ya no existe.'
  return 'Ocurrió un error inesperado.'
}

// User-facing copy for a failed patient delete (DELETE /api/pacientes/{id}). Same ownership rule as update.
export function getPatientDeleteErrorMessage(error: unknown): string {
  if (isNetworkError(error)) return 'No se pudo conectar con el servidor.'
  const status = getErrorStatus(error)
  if (status === 404) return 'No eres el terapeuta responsable de este paciente, o ya no existe.'
  return 'Ocurrió un error inesperado.'
}

// User-facing copy for a failed session write (POST/PUT /sesiones). Mirrors SesionServiceImpl:
// ownership failure is a plain 404, not a 403 — sessions are therapist-only, a familiar never reaches this.
export function getSessionWriteErrorMessage(error: unknown): string {
  if (isNetworkError(error)) return 'No se pudo conectar con el servidor.'
  const status = getErrorStatus(error)
  if (status === 400) {
    const message = getApiErrorBody(error)?.message.trim()
    return message && message.length <= MAX_ECHOED_MESSAGE_LENGTH
      ? `El servidor rechazó los datos: ${message}`
      : 'El servidor rechazó los datos.'
  }
  if (status === 404) return 'No tienes permiso para modificar sesiones de este paciente, o la sesión ya no existe.'
  return 'Ocurrió un error inesperado.'
}

// User-facing copy for a failed session delete.
export function getSessionDeleteErrorMessage(error: unknown): string {
  if (isNetworkError(error)) return 'No se pudo conectar con el servidor.'
  const status = getErrorStatus(error)
  if (status === 404) return 'La sesión ya no existe o no tienes permiso para eliminarla.'
  return 'Ocurrió un error inesperado.'
}

// User-facing copy for a failed collaborator link (POST /colaboradores). Mirrors ColaboradorServiceImpl:
// a 404 deliberately covers both "ese email no existe como familiar" and "no eres el terapeuta
// responsable" (the backend never distinguishes them, by design).
export function getCollaboratorLinkErrorMessage(error: unknown): string {
  if (isNetworkError(error)) return 'No se pudo conectar con el servidor.'
  const status = getErrorStatus(error)
  if (status === 400) return 'El servidor rechazó los datos.'
  if (status === 404) {
    return 'No se encontró una cuenta de familiar con ese email, o no eres el terapeuta responsable de este paciente.'
  }
  if (status === 409) return 'Ese colaborador ya está vinculado a este paciente.'
  return 'Ocurrió un error inesperado.'
}

// User-facing copy for a failed permission change or revoke (PUT/DELETE /colaboradores/{usuarioId}).
export function getCollaboratorWriteErrorMessage(error: unknown): string {
  if (isNetworkError(error)) return 'No se pudo conectar con el servidor.'
  const status = getErrorStatus(error)
  if (status === 404) return 'El vínculo ya no existe o no eres el terapeuta responsable de este paciente.'
  return 'Ocurrió un error inesperado.'
}

// User-facing copy for a failed custom pictogram write (POST/PUT /pictogramas-custom). Mirrors
// CloudinaryServiceImpl.validarArchivo (image type/size via IllegalArgumentException -> 400) and
// PacienteServiceImpl.verificarEdicionParaUsuario (404 for ownership, same ambiguity as elsewhere).
export function getCustomPictogramWriteErrorMessage(error: unknown): string {
  if (isNetworkError(error)) return 'No se pudo conectar con el servidor.'
  const status = getErrorStatus(error)
  if (status === 400) {
    const message = getApiErrorBody(error)?.message.trim()
    return message && message.length <= MAX_ECHOED_MESSAGE_LENGTH
      ? message
      : 'El servidor rechazó el archivo.'
  }
  if (status === 404) return 'No tienes permiso para modificar pictogramas de este paciente, o ya no existe.'
  return 'Ocurrió un error inesperado.'
}

// User-facing copy for a failed custom pictogram delete. Mirrors eliminarPictograma: blocked (400)
// when it is still used by at least one item, or a plain 404 when not the responsible therapist.
export function getCustomPictogramDeleteErrorMessage(error: unknown): string {
  if (isNetworkError(error)) return 'No se pudo conectar con el servidor.'
  const status = getErrorStatus(error)
  if (status === 400) return 'No se puede eliminar: está en uso en al menos una tarjeta de una cartilla.'
  if (status === 404) return 'El pictograma ya no existe o no tienes permiso para eliminarlo.'
  return 'Ocurrió un error inesperado.'
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
