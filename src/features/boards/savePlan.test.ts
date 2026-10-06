import { describe, expect, it } from 'vitest'
import { boardReducer, rebaseDraft } from './boardReducer'
import { toBoard } from './mappers'
import { describeBlocker, planBoardSave, TEXTO_HABLADO_MAX, TEXTO_VISIBLE_MAX } from './savePlan'
import type { SaveBlocker } from './savePlan'
import { boardDetailResponse } from './testing/fixtures'
import type { Board, BoardItem, Pictogram } from './types'

const base = toBoard(boardDetailResponse)

const globalPictogram: Pictogram = { id: 'pic-otro', label: 'otro', imageUrl: 'https://cdn.example.com/otro.png', kind: 'GLOBAL' }
const customPictogram: Pictogram = { id: 'pic-mio', label: 'mio', imageUrl: 'https://cdn.example.com/mio.png', kind: 'CUSTOM' }
const localPictogram: Pictogram = { id: 'arasaac-7272', label: 'hambre', imageUrl: '/pictograms/arasaac/7272.png', kind: 'LOCAL_MOCK' }

function update(board: Board, itemId: string, changes: Partial<BoardItem>): Board {
  return { ...board, items: board.items.map((item) => (item.id === itemId ? { ...item, ...changes } : item)) }
}

function without(board: Board, itemId: string): Board {
  const items = board.items.filter((candidate) => candidate.id !== itemId)
  return { ...board, items: items.map((candidate, index) => ({ ...candidate, visualOrder: index + 1 })) }
}

function item(id: string, categoryId: string, serverOrder: number, visualOrder: number): BoardItem {
  return {
    id,
    categoryId,
    pictogram: { id: `pic-${id}`, label: id, imageUrl: `https://cdn.example.com/${id}.png`, kind: 'GLOBAL' },
    label: id.toUpperCase(),
    spokenText: `Texto ${id}`,
    visualOrder,
    serverOrder,
    isActive: true,
    isCore: false,
  }
}

const gapped: Board = {
  id: 'b',
  name: 'Gapped',
  isPrimary: false,
  creatorId: 'u',
  categories: [{ id: 'c1', name: 'Uno', order: 0, colorHex: '#E0E0E0' }],
  items: [item('w', 'c1', 0, 1), item('x', 'c1', 2, 2), item('y', 'c1', 5, 3), item('z', 'c1', 7, 4)],
}

const reasons = (blockers: SaveBlocker[]) => blockers.map((b) => b.reason)

describe('planBoardSave', () => {
  it('produces nothing without changes', () => {
    expect(planBoardSave(base, structuredClone(base))).toEqual({ updates: [], blockers: [] })
  })

  it('sends one PUT with the full trimmed request for a text edit', () => {
    const draft = update(base, 'item-a1', { label: '  Wc  ', spokenText: ' Quiero ir al wc ' })
    const plan = planBoardSave(base, draft)
    expect(plan.blockers).toEqual([])
    expect(plan.updates).toEqual([
      {
        itemId: 'item-a1',
        categoryId: 'cat-a',
        request: {
          textoVisible: 'Wc',
          textoHablado: 'Quiero ir al wc',
          ordenVisual: 0,
          recursoGlobalId: 'pic-bano',
          recursoCustomId: null,
          esCore: true,
          visibleEnModoUso: true,
        },
        pendingPictogram: null,
      },
    ])
  })

  it('does not treat trim-only edits as changes', () => {
    const draft = update(base, 'item-a1', { label: ' Baño ', spokenText: 'Quiero ir al baño  ' })
    expect(planBoardSave(base, draft)).toEqual({ updates: [], blockers: [] })
  })

  it('sends visibility changes in both directions', () => {
    const hide = planBoardSave(base, update(base, 'item-a1', { isActive: false }))
    expect(hide.updates).toHaveLength(1)
    expect(hide.updates[0].request.visibleEnModoUso).toBe(false)
    const show = planBoardSave(base, update(base, 'item-a3', { isActive: true }))
    expect(show.updates).toHaveLength(1)
    expect(show.updates[0]).toMatchObject({ itemId: 'item-a3', request: { visibleEnModoUso: true, ordenVisual: 3 } })
  })

  it('maps the resource by pictogram kind', () => {
    const toGlobal = planBoardSave(base, update(base, 'item-b2', { pictogram: globalPictogram }))
    expect(toGlobal.updates[0].request).toMatchObject({ recursoGlobalId: 'pic-otro', recursoCustomId: null })
    const toCustom = planBoardSave(base, update(base, 'item-a1', { pictogram: customPictogram }))
    expect(toCustom.updates[0].request).toMatchObject({ recursoGlobalId: null, recursoCustomId: 'pic-mio' })
    expect(toGlobal.updates[0].pendingPictogram).toBeNull()
    expect(toCustom.updates[0].pendingPictogram).toBeNull()
  })

  describe('local ARASAAC pictograms', () => {
    it('plans a pending pictogram with null resource ids and no blocker', () => {
      const plan = planBoardSave(base, update(base, 'item-a1', { pictogram: localPictogram }))
      expect(plan.blockers).toEqual([])
      expect(plan.updates).toHaveLength(1)
      expect(plan.updates[0].pendingPictogram).toEqual({ arasaacId: 7272, label: 'hambre' })
      expect(plan.updates[0].request).toMatchObject({ recursoGlobalId: null, recursoCustomId: null })
    })

    it('trims the label and limits it to 100 characters', () => {
      const long: Pictogram = { ...localPictogram, label: `  ${'x'.repeat(120)}  ` }
      const plan = planBoardSave(base, update(base, 'item-a1', { pictogram: long }))
      expect(plan.updates[0].pendingPictogram).toEqual({ arasaacId: 7272, label: 'x'.repeat(100) })
    })

    it('plans one pending entry per item when two items use the same local pictogram', () => {
      const draft = update(update(base, 'item-a1', { pictogram: localPictogram }), 'item-b2', { pictogram: localPictogram })
      const plan = planBoardSave(base, draft)
      expect(plan.updates.map((u) => [u.itemId, u.pendingPictogram?.arasaacId])).toEqual([
        ['item-a1', 7272],
        ['item-b2', 7272],
      ])
    })

    it('never marks unchanged items as pending', () => {
      const draft = update(base, 'item-a1', { pictogram: localPictogram })
      const plan = planBoardSave(draft, structuredClone(draft))
      expect(plan).toEqual({ updates: [], blockers: [] })
      const other = planBoardSave(base, update(base, 'item-b2', { label: 'Juego' }))
      expect(other.updates[0].pendingPictogram).toBeNull()
    })
  })

  it('swaps orders inside a category reusing the existing values and keeping gaps', () => {
    const draft = boardReducer(gapped, { type: 'moveItem', itemId: 'x', direction: 1 })
    const plan = planBoardSave(gapped, draft)
    expect(plan.blockers).toEqual([])
    // Draft order is w, y, x, z: y takes 2 and x takes 5; w and z keep 0 and 7.
    expect(plan.updates.map((u) => [u.itemId, u.request.ordenVisual])).toEqual([
      ['y', 2],
      ['x', 5],
    ])
  })

  it('is clean again after moving an item and moving it back', () => {
    const moved = boardReducer(gapped, { type: 'moveItem', itemId: 'x', direction: 1 })
    const back = boardReducer(moved, { type: 'moveItem', itemId: 'x', direction: -1 })
    expect(planBoardSave(gapped, back)).toEqual({ updates: [], blockers: [] })
  })

  it('does not change anything when tied orders swap places', () => {
    // item-a2 and item-a1 both have ordenVisual 0.
    const draft = boardReducer(base, { type: 'moveItem', itemId: 'item-a1', direction: -1 })
    expect(planBoardSave(base, draft)).toEqual({ updates: [], blockers: [] })
  })

  it('handles each category independently', () => {
    const board: Board = {
      ...gapped,
      items: [item('a', 'c1', 1, 1), item('b', 'c1', 4, 2), item('c', 'c2', 0, 3), item('d', 'c2', 9, 4)],
    }
    const draft = boardReducer(board, { type: 'moveItem', itemId: 'd', direction: -1 })
    const plan = planBoardSave(board, draft)
    expect(plan.updates.map((u) => [u.itemId, u.categoryId, u.request.ordenVisual])).toEqual([
      ['d', 'c2', 0],
      ['c', 'c2', 9],
    ])
  })

  it('sends one update per changed item only, ordered by draft position', () => {
    let draft = update(base, 'item-b2', { label: 'Juego' })
    draft = update(draft, 'item-a3', { isActive: true })
    draft = boardReducer(draft, { type: 'moveItem', itemId: 'item-a2', direction: 1 })
    const plan = planBoardSave(base, draft)
    expect(plan.blockers).toEqual([])
    expect(plan.updates.map((u) => u.itemId)).toEqual(['item-a3', 'item-b2'])
  })

  describe('blockers', () => {
    it('blocks a blank or too long visible text', () => {
      const blank = planBoardSave(base, update(base, 'item-a1', { label: '   ' }))
      expect(blank.blockers).toEqual([{ itemId: 'item-a1', itemLabel: 'Baño', reason: 'blank-label' }])
      const long = planBoardSave(base, update(base, 'item-a1', { label: 'x'.repeat(TEXTO_VISIBLE_MAX + 1) }))
      expect(reasons(long.blockers)).toEqual(['label-too-long'])
      const exact = planBoardSave(base, update(base, 'item-a1', { label: 'x'.repeat(TEXTO_VISIBLE_MAX) }))
      expect(exact.blockers).toEqual([])
      expect(exact.updates).toHaveLength(1)
    })

    it('blocks a blank or too long spoken text', () => {
      expect(reasons(planBoardSave(base, update(base, 'item-a1', { spokenText: ' ' })).blockers)).toEqual(['blank-spoken-text'])
      const long = planBoardSave(base, update(base, 'item-a1', { spokenText: 'x'.repeat(TEXTO_HABLADO_MAX + 1) }))
      expect(reasons(long.blockers)).toEqual(['spoken-text-too-long'])
    })

    it('blocks missing pictograms and local ones that cannot be linked to ARASAAC', () => {
      const unparsable: Pictogram = { ...localPictogram, id: 'arasaac-abc' }
      const plan = planBoardSave(base, update(base, 'item-a1', { pictogram: unparsable }))
      expect(reasons(plan.blockers)).toEqual(['local-pictogram'])
      expect(plan.updates).toEqual([])
      expect(reasons(planBoardSave(base, update(base, 'item-a1', { pictogram: null })).blockers)).toEqual(['missing-pictogram'])
    })

    it('blocks an item without category', () => {
      const board: Board = { ...gapped, items: [{ ...item('n', 'c1', 0, 1), categoryId: null }] }
      const plan = planBoardSave(board, update(board, 'n', { label: 'Otro' }))
      expect(reasons(plan.blockers)).toEqual(['missing-category'])
    })

    it('reports added and removed items', () => {
      const added = { ...base, items: [...base.items, { ...base.items[0], id: 'new', serverOrder: null, visualOrder: 6 }] }
      expect(planBoardSave(base, added).blockers).toEqual([{ itemId: 'new', itemLabel: 'Hambre', reason: 'added-item' }])
      const removed = without(base, 'item-a1')
      const plan = planBoardSave(base, removed)
      expect(plan.blockers).toEqual([{ itemId: 'item-a1', itemLabel: 'Baño', reason: 'removed-item' }])
      expect(plan.updates).toEqual([])
    })

    it('never puts blocked items in updates but still plans the valid ones', () => {
      let draft = update(base, 'item-a1', { label: '' })
      draft = update(draft, 'item-b2', { label: 'Juego' })
      const plan = planBoardSave(base, draft)
      expect(plan.updates.map((u) => u.itemId)).toEqual(['item-b2'])
      expect(plan.blockers.map((b) => b.itemId)).toEqual(['item-a1'])
    })

    it('does not block unchanged items that are already invalid on the server', () => {
      const invalid = update(base, 'item-b1', { pictogram: null })
      expect(planBoardSave(invalid, structuredClone(invalid))).toEqual({ updates: [], blockers: [] })
    })

    it('does not reorder when a structural blocker exists in the same category', () => {
      const removed = without(gapped, 'z')
      const plan = planBoardSave(gapped, removed)
      expect(plan.updates).toEqual([])
      expect(reasons(plan.blockers)).toEqual(['removed-item'])
    })
  })

  it('plans nothing for a draft rebased onto a snapshot with a deleted item (server gaps stay)', () => {
    const fresh = { ...base, items: base.items.filter((candidate) => candidate.id !== 'item-a1') }
    const draft = rebaseDraft(base, fresh)
    expect(planBoardSave(fresh, draft)).toEqual({ updates: [], blockers: [] })
  })

  it('plans only the pending edit for a draft rebased onto a snapshot with a new item', () => {
    const created = { ...base.items[0], id: 'new', serverOrder: 4, label: 'Nuevo', visualOrder: 6 }
    const fresh = { ...base, items: [...base.items, created] }
    const edited = update(base, 'item-b2', { label: 'Juego' })
    const draft = rebaseDraft(edited, fresh)
    const plan = planBoardSave(fresh, draft)
    expect(plan.blockers).toEqual([])
    expect(plan.updates.map((u) => [u.itemId, u.request.ordenVisual])).toEqual([['item-b2', 5]])
  })

  it('does not mutate its inputs', () => {
    const draft = boardReducer(update(base, 'item-b2', { label: ' Juego ' }), { type: 'moveItem', itemId: 'item-a2', direction: 1 })
    const baseSnapshot = structuredClone(base)
    const draftSnapshot = structuredClone(draft)
    planBoardSave(base, draft)
    expect(base).toEqual(baseSnapshot)
    expect(draft).toEqual(draftSnapshot)
  })
})

describe('describeBlocker', () => {
  const describeReason = (reason: SaveBlocker['reason']) => describeBlocker({ itemId: 'i', itemLabel: 'Baño', reason })

  it('describes every reason in neutral Spanish', () => {
    expect(describeReason('blank-label')).toBe('Baño: el texto visible es obligatorio.')
    expect(describeReason('label-too-long')).toBe('Baño: el texto visible admite hasta 30 caracteres.')
    expect(describeReason('blank-spoken-text')).toBe('Baño: el texto hablado es obligatorio.')
    expect(describeReason('spoken-text-too-long')).toBe('Baño: el texto hablado admite hasta 255 caracteres.')
    expect(describeReason('local-pictogram')).toBe('Baño: el pictograma elegido no se puede vincular con ARASAAC.')
    expect(describeReason('missing-pictogram')).toBe('Baño: no tiene pictograma.')
    expect(describeReason('missing-category')).toBe('Baño: no tiene categoría.')
    expect(describeReason('added-item')).toBe('Agregar tarjetas todavía no se puede guardar.')
    expect(describeReason('removed-item')).toBe('Eliminar tarjetas todavía no se puede guardar.')
  })
})
