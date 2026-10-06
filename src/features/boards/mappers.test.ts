import { describe, expect, it } from 'vitest'
import type { PictogramaGlobalResponse } from './apiTypes'
import { toBoard, toBoardSummaries, toGlobalPictogram, toGlobalPictograms } from './mappers'
import { boardDetailResponse, boardsListResponse, CREATOR_ID } from './testing/fixtures'

describe('toBoardSummaries', () => {
  it('puts principals first, then oldest first', () => {
    expect(toBoardSummaries(boardsListResponse).map((b) => b.id)).toEqual(['c-1', 'c-2', 'c-4', 'c-3'])
  })

  it('maps fields and does not mutate the input', () => {
    const input = [...boardsListResponse]
    const [first] = toBoardSummaries(input)
    expect(first).toEqual({
      id: 'c-1',
      name: 'Principal',
      isPrimary: true,
      creatorId: CREATOR_ID,
      createdAt: '2026-02-01T09:00:00',
    })
    expect(input).toEqual(boardsListResponse)
  })

  it('breaks ties by name', () => {
    const base = boardsListResponse[0]
    const result = toBoardSummaries([
      { ...base, id: 'x', nombre: 'Zeta', creadoEn: '2026-01-01T00:00:00' },
      { ...base, id: 'y', nombre: 'Alfa', creadoEn: '2026-01-01T00:00:00' },
    ])
    expect(result.map((b) => b.id)).toEqual(['y', 'x'])
  })
})

describe('toBoard', () => {
  const board = toBoard(boardDetailResponse)

  it('flattens by category order then item order, keeping ties stable', () => {
    expect(board.items.map((i) => i.id)).toEqual(['item-a2', 'item-a1', 'item-a3', 'item-b1', 'item-b2'])
  })

  it('normalizes visualOrder to 1..n', () => {
    expect(board.items.map((i) => i.visualOrder)).toEqual([1, 2, 3, 4, 5])
  })

  it('keeps hidden items as inactive', () => {
    const hidden = board.items.find((i) => i.id === 'item-a3')
    expect(hidden?.isActive).toBe(false)
    expect(board.items.filter((i) => i.isActive)).toHaveLength(4)
  })

  it('maps item fields', () => {
    expect(board.items.find((i) => i.id === 'item-b2')).toEqual({
      id: 'item-b2',
      categoryId: 'cat-b',
      pictogram: { id: 'pic-custom', label: 'jugar', imageUrl: 'https://cdn.example.com/jugar.png', kind: 'CUSTOM' },
      label: 'Jugar',
      spokenText: 'Quiero jugar un rato',
      visualOrder: 5,
      serverOrder: 5,
      isActive: true,
      isCore: false,
    })
    expect(board.items.find((i) => i.id === 'item-a1')?.isCore).toBe(true)
  })

  it('keeps the backend order of each item per category', () => {
    expect(board.items.map((i) => [i.id, i.serverOrder])).toEqual([
      ['item-a2', 0],
      ['item-a1', 0],
      ['item-a3', 3],
      ['item-b1', 2],
      ['item-b2', 5],
    ])
  })

  it('maps a null pictogram to null', () => {
    expect(board.items.find((i) => i.id === 'item-b1')?.pictogram).toBeNull()
  })

  it('maps board fields', () => {
    expect(board).toMatchObject({ id: 'c-1', name: 'Principal', isPrimary: true, creatorId: CREATOR_ID })
  })

  it('handles a cartilla without categories', () => {
    expect(toBoard({ ...boardDetailResponse, categorias: [] }).items).toEqual([])
  })

  it('does not mutate the input', () => {
    const snapshot = structuredClone(boardDetailResponse)
    toBoard(boardDetailResponse)
    expect(boardDetailResponse).toEqual(snapshot)
  })
})

describe('toGlobalPictogram(s)', () => {
  const dto = (id: string, etiqueta: string, arasaacId: number | null): PictogramaGlobalResponse => ({
    id,
    etiqueta,
    imagenUrl: `https://static.arasaac.org/pictograms/${arasaacId ?? 0}/${arasaacId ?? 0}_300.png`,
    arasaacId,
    creadoEn: '2026-02-01T09:00:00',
  })

  it('maps a library row to a GLOBAL pictogram with its ARASAAC id', () => {
    expect(toGlobalPictogram(dto('u1', 'hambre', 7272))).toEqual({
      id: 'u1',
      label: 'hambre',
      imageUrl: 'https://static.arasaac.org/pictograms/7272/7272_300.png',
      kind: 'GLOBAL',
      arasaacId: 7272,
    })
    expect(toGlobalPictogram(dto('u2', 'propio', null)).arasaacId).toBeNull()
  })

  it('sorts by label with Spanish collation without mutating the input', () => {
    const input = [dto('u1', 'sí', 5584), dto('u2', 'agua', 32464), dto('u3', 'árbol', 1), dto('u4', 'baño', 27559)]
    const snapshot = structuredClone(input)

    expect(toGlobalPictograms(input).map((p) => p.label)).toEqual(['agua', 'árbol', 'baño', 'sí'])
    expect(input).toEqual(snapshot)
  })
})
