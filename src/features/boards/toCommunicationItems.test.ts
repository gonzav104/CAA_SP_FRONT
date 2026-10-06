import { describe, expect, it } from 'vitest'
import { toBoard } from './mappers'
import { boardDetailResponse } from './testing/fixtures'
import { toCommunicationItems } from './toCommunicationItems'

describe('toCommunicationItems', () => {
  const items = toCommunicationItems(toBoard(boardDetailResponse))

  it('excludes hidden items', () => {
    expect(items.map((i) => i.id)).not.toContain('item-a3')
    expect(items).toHaveLength(4)
  })

  it('follows the visual order', () => {
    expect(items.map((i) => i.id)).toEqual(['item-a2', 'item-a1', 'item-b1', 'item-b2'])
    expect(items.map((i) => i.order)).toEqual([1, 2, 4, 5])
  })

  it('uses textoVisible as label and textoHablado as spoken text', () => {
    expect(items.find((i) => i.id === 'item-b2')).toMatchObject({
      label: 'Jugar',
      spokenText: 'Quiero jugar un rato',
      imageUrl: 'https://cdn.example.com/jugar.png',
    })
  })

  it('uses an empty image for items without pictogram', () => {
    expect(items.find((i) => i.id === 'item-b1')?.imageUrl).toBe('')
  })
})
