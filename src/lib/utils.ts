export { cn } from "cn"

/** First letter of a name, for a small identity badge (header, patient cards). */
export function initialOf(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?'
}
