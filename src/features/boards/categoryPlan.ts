import type { BoardCategory } from './types'

/** DB default of `categorias.color_hex`; the approved design shows no category colors, so new ones use it. */
export const DEFAULT_CATEGORY_COLOR = '#E0E0E0'

/** The `categorias.nombre` column holds at most 100 characters (longer names answer 409). */
export const CATEGORY_NAME_MAX = 100

export type CategoryNameProblem = 'blank' | 'too-long'

/** Validates the trimmed name; null when it can be sent. */
export function validateCategoryName(name: string): CategoryNameProblem | null {
  const trimmed = name.trim()
  if (trimmed === '') return 'blank'
  if (trimmed.length > CATEGORY_NAME_MAX) return 'too-long'
  return null
}

export interface CategoryOrderChange {
  categoryId: string
  orden: number
}

/**
 * Plans moving one category a single step. `categories` is in the current display order (by `order`,
 * ties in server order). Returns the `orden` writes needed: none at the edges; a swap of the two values
 * when the neighbour has a different `order`; and, when they are tied (a swap would change nothing),
 * a renumbering 0..n-1 of the whole new order, limited to the categories whose value changes.
 */
export function planCategoryMove(
  categories: BoardCategory[],
  categoryId: string,
  direction: -1 | 1,
): CategoryOrderChange[] {
  const from = categories.findIndex((category) => category.id === categoryId)
  const to = from + direction
  if (from === -1 || to < 0 || to >= categories.length) return []

  const moved = categories[from]
  const neighbour = categories[to]
  if (moved.order !== neighbour.order) {
    return [
      { categoryId: moved.id, orden: neighbour.order },
      { categoryId: neighbour.id, orden: moved.order },
    ]
  }

  const reordered = [...categories]
  reordered.splice(from, 1)
  reordered.splice(to, 0, moved)
  return reordered.flatMap((category, index) => (category.order === index ? [] : [{ categoryId: category.id, orden: index }]))
}

/** "3 tarjetas" / "1 tarjeta", with " · 2 ocultas" appended when some are hidden. */
export function describeCardCount(count: number, hidden: number): string {
  const cards = `${count} ${count === 1 ? 'tarjeta' : 'tarjetas'}`
  return hidden > 0 ? `${cards} · ${hidden} ${hidden === 1 ? 'oculta' : 'ocultas'}` : cards
}
