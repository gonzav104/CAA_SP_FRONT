/** The `cartillas.nombre` column holds at most 100 characters (longer names answer 409). */
export const BOARD_NAME_MAX = 100

export type BoardNameProblem = 'blank' | 'too-long'

/** Validates the trimmed name; null when it can be sent. */
export function validateBoardName(name: string): BoardNameProblem | null {
  const trimmed = name.trim()
  if (trimmed === '') return 'blank'
  if (trimmed.length > BOARD_NAME_MAX) return 'too-long'
  return null
}
