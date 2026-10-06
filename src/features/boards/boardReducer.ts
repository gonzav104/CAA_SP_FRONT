import type { Board, BoardItem } from './types'

/** Matches the Use Mode progression ceiling (6 → 9 → 12 options); limits ADDING only, larger server boards render fine. */
export const MAX_BOARD_ITEMS = 12

export type EditableItemFields = Pick<BoardItem, 'label' | 'spokenText' | 'pictogram' | 'isActive'>

export type BoardAction =
  | { type: 'updateItem'; itemId: string; changes: Partial<EditableItemFields> }
  | { type: 'moveItem'; itemId: string; direction: -1 | 1 }
  | { type: 'addItem'; item: Omit<BoardItem, 'visualOrder' | 'serverOrder'> }
  | { type: 'removeItem'; itemId: string }
  | { type: 'reset'; board: Board }

export function sortByVisualOrder(items: BoardItem[]): BoardItem[] {
  return [...items].sort((a, b) => a.visualOrder - b.visualOrder)
}

/** Rewrites `visualOrder` as 1..n following the array order. */
function renumber(items: BoardItem[]): BoardItem[] {
  return items.map((item, index) => ({ ...item, visualOrder: index + 1 }))
}

export function boardReducer(board: Board, action: BoardAction): Board {
  switch (action.type) {
    case 'updateItem':
      return {
        ...board,
        items: board.items.map((item) =>
          item.id === action.itemId ? { ...item, ...action.changes } : item,
        ),
      }

    case 'moveItem': {
      const items = sortByVisualOrder(board.items)
      const from = items.findIndex((item) => item.id === action.itemId)
      const to = from + action.direction
      if (from === -1 || to < 0 || to >= items.length) return board
      // The backend cannot move an item to another category: only swap within the same one.
      if (items[to].categoryId !== items[from].categoryId) return board
      const [moved] = items.splice(from, 1)
      items.splice(to, 0, moved)
      return { ...board, items: renumber(items) }
    }

    case 'addItem': {
      if (board.items.length >= MAX_BOARD_ITEMS) return board
      const items = sortByVisualOrder(board.items)
      return { ...board, items: renumber([...items, { ...action.item, serverOrder: null, visualOrder: 0 }]) }
    }

    case 'reset':
      return action.board

    case 'removeItem':
      return {
        ...board,
        items: renumber(sortByVisualOrder(board.items).filter((item) => item.id !== action.itemId)),
      }
  }
}
