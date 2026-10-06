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

const libraryEntry = (id: string, arasaacId: number | null): Pictogram => ({
  id,
  label: id,
  imageUrl: `https://static.arasaac.org/pictograms/${arasaacId ?? 0}/${arasaacId ?? 0}_300.png`,
  kind: 'GLOBAL',
  arasaacId,
})

describe('arasaacIdOf', () => {
  it('reads the id of a local library entry', () => {
    expect(arasaacIdOf(mockPictograms[0])).toBe(27559)
  })

  it('reads the id from the CDN url of a real pictogram', () => {
    expect(arasaacIdOf(real('p1', 'https://static.arasaac.org/pictograms/7272/7272_500.png'))).toBe(7272)
  })

  it('prefers the explicit arasaacId over the url', () => {
    expect(arasaacIdOf({ ...real('p1', 'https://static.arasaac.org/pictograms/7272/7272_500.png'), arasaacId: 99 })).toBe(99)
    expect(arasaacIdOf({ ...real('p1', 'https://cdn.example.com/x.png'), arasaacId: 99 })).toBe(99)
  })

  it('falls back to the url when the explicit arasaacId is null', () => {
    expect(arasaacIdOf({ ...real('p1', 'https://static.arasaac.org/pictograms/7272/7272_500.png'), arasaacId: null })).toBe(7272)
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
    const options = getPickerOptions([a, b, a], [], mockPictograms)
    expect(options.slice(0, 2)).toEqual([a, b])
    expect(options).toHaveLength(2 + mockPictograms.length)
  })

  it('lists the rest of the global library after the board, deduped by id', () => {
    const a = libraryEntry('a', 1)
    const x = libraryEntry('x', 2)
    const y = libraryEntry('y', 3)
    const options = getPickerOptions([a], [x, a, y, x], [])
    expect(options).toEqual([a, x, y])
  })

  it('hides a local entry whose ARASAAC id is covered by a library entry', () => {
    const hambre = libraryEntry('u-hambre', 7272)
    const options = getPickerOptions([], [hambre], mockPictograms)
    expect(options[0]).toBe(hambre)
    expect(options.some((p) => p.id === 'arasaac-7272')).toBe(false)
    expect(options).toHaveLength(mockPictograms.length)
  })

  it('hides a local entry whose ARASAAC id is covered by a board pictogram', () => {
    const hambre = real('p-hambre', 'https://static.arasaac.org/pictograms/7272/7272_500.png')
    const options = getPickerOptions([hambre], [], mockPictograms)
    expect(options[0]).toBe(hambre)
    expect(options.some((p) => p.id === 'arasaac-7272')).toBe(false)
    expect(options).toHaveLength(mockPictograms.length)
  })

  it('keeps a local entry that no real pictogram covers', () => {
    const other = libraryEntry('u-other', 1)
    const options = getPickerOptions([], [other], mockPictograms)
    expect(options).toEqual([other, ...mockPictograms])
  })

  it('keeps a CUSTOM board pictogram, which is not in the library', () => {
    const custom = real('custom-1', 'https://cdn.example.com/custom.png', 'CUSTOM')
    const options = getPickerOptions([custom], [libraryEntry('u1', 1)], [])
    expect(options.map((p) => p.id)).toEqual(['custom-1', 'u1'])
  })

  it('ignores local library pictograms found on the board', () => {
    expect(getPickerOptions([mockPictograms[0]], [], mockPictograms)).toEqual(mockPictograms)
  })

  it('returns the whole local library when there is nothing else', () => {
    expect(getPickerOptions([], [], mockPictograms)).toEqual(mockPictograms)
  })
})
