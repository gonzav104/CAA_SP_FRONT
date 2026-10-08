import type { CommunicationCategory } from '@/features/communication/types'
import { sortByVisualOrder } from './boardReducer'
import type { Board } from './types'

/**
 * What the person sees in Use Mode, grouped by category: the cartilla's real categories, in the
 * therapist's order, each with only its active items in visual order. A category with no visible
 * item is omitted entirely — it still exists in the Editor, it just has nothing to navigate to here.
 */
export function toCommunicationCategories(board: Board): CommunicationCategory[] {
  const visibleItems = sortByVisualOrder(board.items).filter((item) => item.isActive)

  return board.categories
    .map((category) => ({
      id: category.id,
      name: category.name,
      items: visibleItems
        .filter((item) => item.categoryId === category.id)
        .map((item) => ({
          id: item.id,
          label: item.label,
          spokenText: item.spokenText,
          imageUrl: item.pictogram?.imageUrl ?? '',
          order: item.visualOrder,
        })),
    }))
    .filter((category) => category.items.length > 0)
}
