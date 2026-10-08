import { describe, expect, it } from 'vitest'
import { toBoard } from './mappers'
import { boardDetailResponse } from './testing/fixtures'
import { toCommunicationCategories } from './toCommunicationCategories'
import type { Board } from './types'

describe('toCommunicationCategories', () => {
  const categories = toCommunicationCategories(toBoard(boardDetailResponse))

  it('groups visible items under their real category, categories in therapist order', () => {
    expect(categories.map((c) => c.name)).toEqual(['Necesidades', 'Acciones'])
  })

  it('orders items within a category by visual order, independent of the other categories', () => {
    expect(categories[0].items.map((i) => i.label)).toEqual(['Hambre', 'Baño'])
    expect(categories[1].items.map((i) => i.label)).toEqual(['Ayuda', 'Jugar'])
  })

  it('excludes hidden items but keeps the category when another item is still visible', () => {
    const allLabels = categories.flatMap((c) => c.items.map((i) => i.label))
    expect(allLabels).not.toContain('Sed')
  })

  it('maps textoVisible/textoHablado/imagenUrl the same way as the flat mapper', () => {
    const jugar = categories[1].items.find((i) => i.label === 'Jugar')
    expect(jugar).toMatchObject({ spokenText: 'Quiero jugar un rato', imageUrl: 'https://cdn.example.com/jugar.png' })
    const ayuda = categories[1].items.find((i) => i.label === 'Ayuda')
    expect(ayuda?.imageUrl).toBe('')
  })

  it('omits a category whose every item is hidden', () => {
    const board = toBoard(boardDetailResponse)
    const allHidden: Board = {
      ...board,
      items: board.items.map((item) => (item.categoryId === 'cat-b' ? { ...item, isActive: false } : item)),
    }
    const result = toCommunicationCategories(allHidden)
    expect(result.map((c) => c.id)).toEqual(['cat-a'])
  })

  it('omits a category that has no items at all', () => {
    const board = toBoard(boardDetailResponse)
    const withEmptyCategory: Board = {
      ...board,
      categories: [...board.categories, { id: 'cat-c', name: 'Vacía', order: 2, colorHex: '#000000' }],
    }
    const result = toCommunicationCategories(withEmptyCategory)
    expect(result.map((c) => c.id)).toEqual(['cat-a', 'cat-b'])
  })

  it('returns an empty list when no category has a visible item', () => {
    const board = toBoard(boardDetailResponse)
    const allHidden: Board = { ...board, items: board.items.map((item) => ({ ...item, isActive: false })) }
    expect(toCommunicationCategories(allHidden)).toEqual([])
  })

  it('handles a single category', () => {
    const board = toBoard(boardDetailResponse)
    const single: Board = { ...board, categories: board.categories.filter((c) => c.id === 'cat-a') }
    const result = toCommunicationCategories(single)
    expect(result.map((c) => c.id)).toEqual(['cat-a'])
  })
})
