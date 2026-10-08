export const PERMISSION_LABELS = {
  LECTURA: 'Solo lectura',
  EDICION_LIMITADA: 'Edición limitada',
} as const

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/** `2018-05-12` -> `12/05/2018`. String-based on purpose: no Date, so no timezone shifts. */
export function formatBirthDate(isoDate: string): string {
  const match = ISO_DATE.exec(isoDate)
  if (!match) return isoDate
  const [, year, month, day] = match
  return `${day}/${month}/${year}`
}
