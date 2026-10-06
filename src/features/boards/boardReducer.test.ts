import { describe, expect, it } from 'vitest'
import { boardReducer, isBoardDirty, MAX_BOARD_ITEMS } from './boardReducer'
import { toBoard } from './mappers'
import { boardDetailResponse } from './testing/fixtures'
import type { Board, BoardItem } from './types'

const base = toBoard(boardDetailResponse)

const newItem: Omit<BoardItem, 'visualOrder'> = {
  id: 'new',
  categoryId: null,
  pictogram: null,
  label: 'Nuevo',
  spokenText: 'Nuevo',
  isActive: true,
  isCore: false,
}

const ids = (board: Board) => board.items.map((i) => i.id)

describe('boardReducer', () => {
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

  it('adds an item at the end', () => {
    const result = boardReducer(base, { type: 'addItem', item: newItem })
    expect(ids(result).at(-1)).toBe('new')
    expect(result.items.at(-1)?.visualOrder).toBe(6)
  })

  it('does not add beyond the limit but renders larger boards', () => {
    let board = base
    for (let i = 0; board.items.length < MAX_BOARD_ITEMS; i++) {
      board = boardReducer(board, { type: 'addItem', item: { ...newItem, id: `n${i}` } })
    }
    expect(board.items).toHaveLength(MAX_BOARD_ITEMS)
    expect(boardReducer(board, { type: 'addItem', item: newItem })).toBe(board)
  })

  it('removes an item and renumbers', () => {
    const result = boardReducer(base, { type: 'removeItem', itemId: 'item-a2' })
    expect(ids(result)).toEqual(['item-a1', 'item-a3', 'item-b1', 'item-b2'])
    expect(result.items.map((i) => i.visualOrder)).toEqual([1, 2, 3, 4])
  })

  it('resets to the given board', () => {
    const edited = boardReducer(base, { type: 'removeItem', itemId: 'item-a2' })
    expect(boardReducer(edited, { type: 'reset', board: base })).toBe(base)
  })
})

describe('isBoardDirty', () => {
  it('is false for an identical board', () => {
    expect(isBoardDirty(base, structuredClone(base))).toBe(false)
  })

  it('is true after editing text, visibility, removing or adding', () => {
    expect(isBoardDirty(boardReducer(base, { type: 'updateItem', itemId: 'item-a1', changes: { label: 'X' } }), base)).toBe(true)
    expect(isBoardDirty(boardReducer(base, { type: 'updateItem', itemId: 'item-a1', changes: { isActive: false } }), base)).toBe(true)
    expect(isBoardDirty(boardReducer(base, { type: 'removeItem', itemId: 'item-a1' }), base)).toBe(true)
    expect(isBoardDirty(boardReducer(base, { type: 'addItem', item: newItem }), base)).toBe(true)
  })

  it('is true when the name differs', () => {
    expect(isBoardDirty({ ...base, name: 'Otra' }, base)).toBe(true)
  })

  it('is true after a move and false after moving it back', () => {
    const moved = boardReducer(base, { type: 'moveItem', itemId: 'item-a1', direction: 1 })
    expect(isBoardDirty(moved, base)).toBe(true)
    const back = boardReducer(moved, { type: 'moveItem', itemId: 'item-a1', direction: -1 })
    expect(isBoardDirty(back, base)).toBe(false)
  })
})
