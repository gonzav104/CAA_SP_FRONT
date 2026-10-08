const ISO_DATETIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/

/** `2026-01-01T10:30:00` -> `01/01/2026 · 10:30`. String-based: no Date, no timezone shifts. */
export function formatSessionDateTime(isoDateTime: string): string {
  const match = ISO_DATETIME.exec(isoDateTime)
  if (!match) return isoDateTime
  const [, year, month, day, hour, minute] = match
  return `${day}/${month}/${year} · ${hour}:${minute}`
}

/** `2026-01-01T10:30:00` -> `2026-01-01T10:30` (the precision a `datetime-local` input accepts). */
export function toDateTimeInputValue(isoDateTime: string): string {
  const match = ISO_DATETIME.exec(isoDateTime)
  if (!match) return isoDateTime
  const [, year, month, day, hour, minute] = match
  return `${year}-${month}-${day}T${hour}:${minute}`
}
