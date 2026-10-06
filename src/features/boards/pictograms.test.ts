import { describe, expect, it } from 'vitest'
import { mockPictograms } from './data/mockPictograms'
import { arasaacIdOf, getPickerOptions } from './pictograms'
import type { Pictogram } from './types'

const real = (id: string, imageUrl: string, kind: Pictogram['kind'] = 'GLOBAL'): Pictogram => ({
  id,
  label: id,
  imageUrl,
  kind,
})

describe('arasaacIdOf', () => {
  it('reads the id of a local library entry', () => {
    expect(arasaacIdOf(mockPictograms[0])).toBe(27559)
  })

  it('reads the id from the CDN url of a real pictogram', () => {
    expect(arasaacIdOf(real('p1', 'https://static.arasaac.org/pictograms/7272/7272_500.png'))).toBe(7272)
  })

  it('returns null when there is no ARASAAC id', () => {
    expect(arasaacIdOf(real('p1', 'https://cdn.example.com/hambre.png'))).toBeNull()
    expect(arasaacIdOf({ ...mockPictograms[0], id: 'custom-1' })).toBeNull()
  })
})

describe('getPickerOptions', () => {
  it('puts real board pictograms first, deduped by id, in board order', () => {
    const a = real('a', 'https://cdn.example.com/a.png')
    const b = real('b', 'https://cdn.example.com/b.png', 'CUSTOM')
    const options = getPickerOptions([a, b, a], mockPictograms)
    expect(options.slice(0, 2)).toEqual([a, b])
    expect(options).toHaveLength(2 + mockPictograms.length)
  })

  it('hides library entries already covered by a real board pictogram', () => {
    const hambre = real('p-hambre', 'https://static.arasaac.org/pictograms/7272/7272_500.png')
    const options = getPickerOptions([hambre], mockPictograms)
    expect(options[0]).toBe(hambre)
    expect(options.some((p) => p.id === 'arasaac-7272')).toBe(false)
    expect(options).toHaveLength(mockPictograms.length)
  })

  it('ignores local library pictograms found on the board', () => {
    expect(getPickerOptions([mockPictograms[0]], mockPictograms)).toEqual(mockPictograms)
  })

  it('returns the whole library for an empty board', () => {
    expect(getPickerOptions([], mockPictograms)).toEqual(mockPictograms)
  })
})
