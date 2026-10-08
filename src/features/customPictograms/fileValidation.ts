// Mirrors CloudinaryServiceImpl.validarArchivo: the exact real limits the backend enforces.
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

export const ACCEPT_ATTRIBUTE = ALLOWED_MIME_TYPES.join(',')

/** Fails fast with the same rule the backend will apply, before spending an upload on it. */
export function validateImageFile(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return 'Usa una imagen JPEG, PNG o WEBP.'
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return 'La imagen supera el tamaño máximo de 5MB.'
  }
  return null
}
