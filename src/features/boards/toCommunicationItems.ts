import type { CommunicationItem } from '@/features/communication/types'
import { sortByVisualOrder } from './boardReducer'
import type { Board } from './types'

/** What the person sees in Use Mode: active items only, in their configured order. */
export function toCommunicationItems(board: Board): CommunicationItem[] {
  return sortByVisualOrder(board.items)
    .filter((item) => item.isActive)
    .map((item) => ({
      id: item.id,
      label: item.label,
      spokenText: item.spokenText,
      imageUrl: item.pictogram?.imageUrl ?? '',
      order: item.visualOrder,
    }))
}
