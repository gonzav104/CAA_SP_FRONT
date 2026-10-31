import type { MouseEvent } from 'react'
export { cn } from "cn"

/** First letter of a name, for a small identity badge (header, patient cards). */
export function initialOf(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?'
}

/**
 * For the Cancelar of a form that validates on blur: without it, pressing the button blurs the field,
 * the error that appears moves the button away, and the click lands nowhere.
 */
export function keepFieldFocus(event: MouseEvent): void {
  event.preventDefault()
}
