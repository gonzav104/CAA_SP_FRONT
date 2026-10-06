import type { Board, BoardItem } from './types'

/** Matches the Use Mode progression ceiling (6 → 9 → 12 options); limits CREATING only, larger server boards render fine. */
export const MAX_BOARD_ITEMS = 12

export type EditableItemFields = Pick<BoardItem, 'label' | 'spokenText' | 'pictogram' | 'isActive'>

export type BoardAction =
  | { type: 'updateItem'; itemId: string; changes: Partial<EditableItemFields> }
  | { type: 'moveItem'; itemId: string; direction: -1 | 1 }
  | { type: 'rebase'; fresh: Board }
  | { type: 'reset'; board: Board }

export function sortByVisualOrder(items: BoardItem[]): BoardItem[] {
  return [...items].sort((a, b) => a.visualOrder - b.visualOrder)
}

/** Rewrites `visualOrder` as 1..n following the array order. */
function renumber(items: BoardItem[]): BoardItem[] {
  return items.map((item, index) => ({ ...item, visualOrder: index + 1 }))
}

function byServerOrderThenId(a: BoardItem, b: BoardItem): number {
  const orderA = a.serverOrder ?? Number.MAX_SAFE_INTEGER
  const orderB = b.serverOrder ?? Number.MAX_SAFE_INTEGER
  return orderA - orderB || a.id.localeCompare(b.id)
}

/**
 * Re-applies the local draft on top of a fresh server snapshot (after an immediate create or delete).
 * Structure and server fields (`id`, `name`, `isPrimary`, `creatorId`, `categories`, `categoryId`,
 * `serverOrder`, `isCore`) come from `fresh`; items present in both keep the draft's editable fields and
 * relative order; new server items go at the end of their category (by server order, then id);
 * items deleted on the server disappear. `visualOrder` is renumbered 1..n grouped by category order,
 * with items of an unknown category last. Never mutates its inputs.
 */
export function rebaseDraft(draft: Board, fresh: Board): Board {
  const draftById = new Map(draft.items.map((item) => [item.id, item]))
  const draftOrder = sortByVisualOrder(draft.items)
  const freshById = new Map(fresh.items.map((item) => [item.id, item]))

  const groups = new Map<string | null, BoardItem[]>(fresh.categories.map((category) => [category.id, []]))
  const push = (item: BoardItem) => {
    const group = groups.get(item.categoryId)
    if (group) group.push(item)
    else groups.set(item.categoryId, [item])
  }

  for (const { id } of draftOrder) {
    const serverItem = freshById.get(id)
    const draftItem = draftById.get(id)
    if (!serverItem || !draftItem) continue
    push({
      ...serverItem,
      label: draftItem.label,
      spokenText: draftItem.spokenText,
      pictogram: draftItem.pictogram,
      isActive: draftItem.isActive,
    })
  }
  for (const item of [...fresh.items].filter((candidate) => !draftById.has(candidate.id)).sort(byServerOrderThenId)) {
    push(item)
  }

  return {
    id: fresh.id,
    name: fresh.name,
    isPrimary: fresh.isPrimary,
    creatorId: fresh.creatorId,
    categories: fresh.categories,
    items: renumber([...groups.values()].flat()),
  }
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

    case 'rebase':
      return rebaseDraft(board, action.fresh)

    case 'reset':
      return action.board
  }
}
