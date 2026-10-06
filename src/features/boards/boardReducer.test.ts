import { describe, expect, it } from 'vitest'
import type { CartillaDetalleResponse, ItemDetalleResponse } from './apiTypes'
import { boardReducer, MAX_BOARD_ITEMS, rebaseDraft } from './boardReducer'
import { toBoard } from './mappers'
import { boardDetailResponse } from './testing/fixtures'
import type { Board } from './types'

const base = toBoard(boardDetailResponse)

const ids = (board: Board) => board.items.map((i) => i.id)
const find = (board: Board, id: string) => board.items.find((i) => i.id === id)

function serverItem(id: string, ordenVisual: number, textoVisible = id): ItemDetalleResponse {
  return {
    id,
    textoHablado: `Texto ${id}`,
    ordenVisual,
    pictograma: { id: `pic-${id}`, etiqueta: id, imagenUrl: `https://cdn.example.com/${id}.png`, tipo: 'GLOBAL' },
    esCore: false,
    textoVisible,
    visibleEnModoUso: true,
  }
}

/** A fresh server snapshot derived from the fixture by `change`. */
function freshFrom(change: (detail: CartillaDetalleResponse) => void): Board {
  const detail = structuredClone(boardDetailResponse)
  change(detail)
  return toBoard(detail)
}

const category = (detail: CartillaDetalleResponse, id: string) => {
  const found = detail.categorias.find((c) => c.id === id)
  if (!found) throw new Error(`Unknown category ${id}`)
  return found
}

describe('boardReducer', () => {
  it('exposes the limit that applies to creating cards', () => {
    expect(MAX_BOARD_ITEMS).toBe(12)
  })

  it('updates item fields', () => {
    const result = boardReducer(base, { type: 'updateItem', itemId: 'item-a1', changes: { label: 'Wc', isActive: false } })
    expect(result.items.find((i) => i.id === 'item-a1')).toMatchObject({ label: 'Wc', isActive: false })
  })

  it('moves an item and keeps contiguous order', () => {
    const result = boardReducer(base, { type: 'moveItem', itemId: 'item-a1', direction: -1 })
    expect(ids(result).slice(0, 2)).toEqual(['item-a1', 'item-a2'])
    expect(result.items.map((i) => i.visualOrder)).toEqual([1, 2, 3, 4, 5])
  })

  it('ignores moves out of bounds', () => {
    expect(boardReducer(base, { type: 'moveItem', itemId: 'item-a2', direction: -1 })).toBe(base)
    expect(boardReducer(base, { type: 'moveItem', itemId: 'item-b2', direction: 1 })).toBe(base)
  })

  it('does not move an item across a category boundary', () => {
    // item-a3 is the last of cat-a; its neighbor item-b1 belongs to cat-b.
    expect(boardReducer(base, { type: 'moveItem', itemId: 'item-a3', direction: 1 })).toBe(base)
    expect(boardReducer(base, { type: 'moveItem', itemId: 'item-b1', direction: -1 })).toBe(base)
  })

  it('treats a null category as its own category when moving', () => {
    const withLocal: Board = {
      ...base,
      items: [...base.items, { ...base.items[0], id: 'local', categoryId: null, serverOrder: null, visualOrder: 6 }],
    }
    expect(boardReducer(withLocal, { type: 'moveItem', itemId: 'local', direction: -1 })).toBe(withLocal)
  })

  it('moves within a category in both directions', () => {
    const down = boardReducer(base, { type: 'moveItem', itemId: 'item-a1', direction: 1 })
    expect(ids(down).slice(0, 3)).toEqual(['item-a2', 'item-a3', 'item-a1'])
    const up = boardReducer(base, { type: 'moveItem', itemId: 'item-b2', direction: -1 })
    expect(ids(up).slice(3)).toEqual(['item-b2', 'item-b1'])
  })

  it('resets to the given board', () => {
    const edited = boardReducer(base, { type: 'updateItem', itemId: 'item-a2', changes: { label: 'X' } })
    expect(boardReducer(edited, { type: 'reset', board: base })).toBe(base)
  })

  it('rebases the draft onto a fresh snapshot', () => {
    const edited = boardReducer(base, { type: 'updateItem', itemId: 'item-a2', changes: { label: 'Comida' } })
    const fresh = freshFrom((detail) => category(detail, 'cat-b').items.push(serverItem('item-b3', 6)))

    const result = boardReducer(edited, { type: 'rebase', fresh })

    expect(ids(result)).toEqual(['item-a2', 'item-a1', 'item-a3', 'item-b1', 'item-b2', 'item-b3'])
    expect(find(result, 'item-a2')?.label).toBe('Comida')
  })
})

describe('rebaseDraft', () => {
  it('returns an equal board when nothing changed on the server', () => {
    expect(rebaseDraft(base, structuredClone(base))).toEqual(base)
  })

  it('puts a new item at the end of its category group', () => {
    const fresh = freshFrom((detail) => category(detail, 'cat-a').items.push(serverItem('item-a4', 4)))

    const result = rebaseDraft(base, fresh)

    expect(ids(result)).toEqual(['item-a2', 'item-a1', 'item-a3', 'item-a4', 'item-b1', 'item-b2'])
    expect(result.items.map((i) => i.visualOrder)).toEqual([1, 2, 3, 4, 5, 6])
    expect(find(result, 'item-a4')).toMatchObject({ categoryId: 'cat-a', serverOrder: 4, label: 'item-a4' })
  })

  it('puts a new item into an empty category and keeps the category listed', () => {
    const emptyDraft = freshFrom((detail) => {
      detail.categorias.push({ id: 'cat-c', nombre: 'Lugares', colorHex: '#000000', orden: 2, items: [] })
    })
    const fresh = freshFrom((detail) => {
      detail.categorias.push({ id: 'cat-c', nombre: 'Lugares', colorHex: '#000000', orden: 2, items: [serverItem('item-c1', 0)] })
    })

    const result = rebaseDraft(emptyDraft, fresh)

    expect(ids(result).at(-1)).toBe('item-c1')
    expect(result.items.at(-1)).toMatchObject({ categoryId: 'cat-c', serverOrder: 0, visualOrder: 6 })
    expect(result.categories.map((c) => c.id)).toEqual(['cat-a', 'cat-b', 'cat-c'])
  })

  it('drops items deleted on the server and renumbers', () => {
    const fresh = freshFrom((detail) => {
      category(detail, 'cat-a').items = category(detail, 'cat-a').items.filter((i) => i.id !== 'item-a1')
    })

    const result = rebaseDraft(base, fresh)

    expect(ids(result)).toEqual(['item-a2', 'item-a3', 'item-b1', 'item-b2'])
    expect(result.items.map((i) => i.visualOrder)).toEqual([1, 2, 3, 4])
    // The gap left by the deletion is kept in the server orders.
    expect(result.items.map((i) => i.serverOrder)).toEqual([0, 3, 2, 5])
  })

  it('keeps pending edits of the existing items and takes server fields from fresh', () => {
    let draft = boardReducer(base, { type: 'updateItem', itemId: 'item-a1', changes: { label: 'Wc', spokenText: 'Voy al wc', isActive: false } })
    draft = boardReducer(draft, {
      type: 'updateItem',
      itemId: 'item-b1',
      changes: { pictogram: { id: 'pic-otro', label: 'otro', imageUrl: 'https://cdn.example.com/otro.png', kind: 'GLOBAL' } },
    })
    const fresh = freshFrom((detail) => {
      const a1 = category(detail, 'cat-a').items.find((i) => i.id === 'item-a1')
      if (a1) {
        a1.textoVisible = 'Server label'
        a1.esCore = false
        a1.ordenVisual = 9
      }
      category(detail, 'cat-b').items.push(serverItem('item-b3', 6))
    })

    const result = rebaseDraft(draft, fresh)

    expect(find(result, 'item-a1')).toMatchObject({
      label: 'Wc',
      spokenText: 'Voy al wc',
      isActive: false,
      isCore: false,
      serverOrder: 9,
      categoryId: 'cat-a',
    })
    expect(find(result, 'item-b1')?.pictogram?.id).toBe('pic-otro')
    expect(find(result, 'item-b3')?.label).toBe('item-b3')
  })

  it('keeps the relative order of a pending reorder and appends new items after it', () => {
    const draft = boardReducer(base, { type: 'moveItem', itemId: 'item-a1', direction: 1 })
    expect(ids(draft).slice(0, 3)).toEqual(['item-a2', 'item-a3', 'item-a1'])
    const fresh = freshFrom((detail) => category(detail, 'cat-a').items.push(serverItem('item-a4', 4)))

    const result = rebaseDraft(draft, fresh)

    expect(ids(result)).toEqual(['item-a2', 'item-a3', 'item-a1', 'item-a4', 'item-b1', 'item-b2'])
  })

  it('sorts several new items by server order, then id', () => {
    const fresh = freshFrom((detail) => {
      category(detail, 'cat-a').items.push(serverItem('z-late', 8), serverItem('b-tie', 6), serverItem('a-tie', 6))
    })

    expect(ids(rebaseDraft(base, fresh)).slice(3, 6)).toEqual(['a-tie', 'b-tie', 'z-late'])
  })

  it('picks up renamed categories, the board name and new categories', () => {
    const fresh = freshFrom((detail) => {
      detail.nombre = 'Renombrada'
      category(detail, 'cat-a').nombre = 'Básicas'
      detail.categorias.push({ id: 'cat-c', nombre: 'Lugares', colorHex: '#000000', orden: 7, items: [] })
    })

    const result = rebaseDraft(base, fresh)

    expect(result.name).toBe('Renombrada')
    expect(result.categories).toEqual([
      { id: 'cat-a', name: 'Básicas', order: 0 },
      { id: 'cat-b', name: 'Acciones', order: 1 },
      { id: 'cat-c', name: 'Lugares', order: 7 },
    ])
  })

  it('follows the category order of the fresh snapshot and puts unknown categories last', () => {
    const fresh = freshFrom(() => undefined)
    const orphan = { ...fresh.items[0], id: 'orphan', categoryId: 'ghost', serverOrder: 0 }
    const withOrphan: Board = { ...fresh, items: [orphan, ...fresh.items] }

    const result = rebaseDraft(base, withOrphan)

    expect(ids(result)).toEqual(['item-a2', 'item-a1', 'item-a3', 'item-b1', 'item-b2', 'orphan'])
  })

  it('does not mutate its inputs', () => {
    const draft = boardReducer(base, { type: 'moveItem', itemId: 'item-a1', direction: 1 })
    const fresh = freshFrom((detail) => category(detail, 'cat-a').items.push(serverItem('item-a4', 4)))
    const draftSnapshot = structuredClone(draft)
    const freshSnapshot = structuredClone(fresh)

    rebaseDraft(draft, fresh)

    expect(draft).toEqual(draftSnapshot)
    expect(fresh).toEqual(freshSnapshot)
  })
})
