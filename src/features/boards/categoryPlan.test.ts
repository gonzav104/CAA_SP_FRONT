import { describe, expect, it } from 'vitest'
import { isCategoryEditorDirty } from './categoryEditor'
import {
  CATEGORY_NAME_MAX,
  DEFAULT_CATEGORY_COLOR,
  describeCardCount,
  planCategoryMove,
  validateCategoryName,
} from './categoryPlan'
import type { BoardCategory } from './types'

const category = (id: string, order: number, name = id): BoardCategory => ({ id, name, order, colorHex: '#E0E0E0' })

describe('DEFAULT_CATEGORY_COLOR', () => {
  it('is the DB default color and a valid hex color', () => {
    expect(DEFAULT_CATEGORY_COLOR).toBe('#E0E0E0')
    expect(DEFAULT_CATEGORY_COLOR).toMatch(/^#[0-9A-Fa-f]{6}$/)
  })
})

describe('validateCategoryName', () => {
  it('rejects blank names (after trimming)', () => {
    expect(validateCategoryName('')).toBe('blank')
    expect(validateCategoryName('   ')).toBe('blank')
  })

  it('accepts up to 100 trimmed characters and rejects more', () => {
    expect(CATEGORY_NAME_MAX).toBe(100)
    expect(validateCategoryName('a'.repeat(100))).toBeNull()
    expect(validateCategoryName(`  ${'a'.repeat(100)}  `)).toBeNull()
    expect(validateCategoryName('a'.repeat(101))).toBe('too-long')
    expect(validateCategoryName('Lugares')).toBeNull()
  })
})

describe('describeCardCount', () => {
  it('pluralizes and appends the hidden count', () => {
    expect(describeCardCount(0, 0)).toBe('0 tarjetas')
    expect(describeCardCount(1, 0)).toBe('1 tarjeta')
    expect(describeCardCount(3, 0)).toBe('3 tarjetas')
    expect(describeCardCount(3, 1)).toBe('3 tarjetas · 1 oculta')
    expect(describeCardCount(3, 2)).toBe('3 tarjetas · 2 ocultas')
  })
})

describe('planCategoryMove', () => {
  const distinct = [category('a', 0), category('b', 1), category('c', 2)]

  it('returns nothing at the edges and for an unknown category', () => {
    expect(planCategoryMove(distinct, 'a', -1)).toEqual([])
    expect(planCategoryMove(distinct, 'c', 1)).toEqual([])
    expect(planCategoryMove(distinct, 'zzz', 1)).toEqual([])
    expect(planCategoryMove([category('a', 0)], 'a', 1)).toEqual([])
  })

  it('swaps the two values when the neighbour has a different order', () => {
    expect(planCategoryMove(distinct, 'b', -1)).toEqual([
      { categoryId: 'b', orden: 0 },
      { categoryId: 'a', orden: 1 },
    ])
    expect(planCategoryMove(distinct, 'b', 1)).toEqual([
      { categoryId: 'b', orden: 2 },
      { categoryId: 'c', orden: 1 },
    ])
  })

  it('swaps over gaps reusing the existing values', () => {
    const gapped = [category('a', 0), category('b', 5), category('c', 9)]
    expect(planCategoryMove(gapped, 'c', -1)).toEqual([
      { categoryId: 'c', orden: 5 },
      { categoryId: 'b', orden: 9 },
    ])
  })

  it('renumbers 0..n-1 following the new order on a tie, returning only the values that change', () => {
    const tied = [category('a', 0), category('b', 0), category('c', 1)]
    // Moving b up past a (tied): new order b, a, c -> b 0 (same), a 1, c 2.
    expect(planCategoryMove(tied, 'b', -1)).toEqual([
      { categoryId: 'a', orden: 1 },
      { categoryId: 'c', orden: 2 },
    ])
    // Moving a down past b (tied): new order b, a, c -> same result.
    expect(planCategoryMove(tied, 'a', 1)).toEqual([
      { categoryId: 'a', orden: 1 },
      { categoryId: 'c', orden: 2 },
    ])
  })

  it('renumbers a tie in the middle of gapped values', () => {
    const tied = [category('a', 3), category('b', 3), category('c', 3)]
    expect(planCategoryMove(tied, 'c', -1)).toEqual([
      { categoryId: 'a', orden: 0 },
      { categoryId: 'c', orden: 1 },
      { categoryId: 'b', orden: 2 },
    ])
  })

  it('does not mutate its input', () => {
    const tied = [category('a', 0), category('b', 0)]
    const snapshot = structuredClone(tied)
    planCategoryMove(tied, 'b', -1)
    expect(tied).toEqual(snapshot)
  })
})

describe('isCategoryEditorDirty', () => {
  const categories = [category('a', 0, 'Necesidades')]

  it('is false without an editor and for an untouched editor', () => {
    expect(isCategoryEditorDirty(null, categories)).toBe(false)
    expect(isCategoryEditorDirty({ kind: 'create', name: '' }, categories)).toBe(false)
    expect(isCategoryEditorDirty({ kind: 'create', name: '   ' }, categories)).toBe(false)
    expect(isCategoryEditorDirty({ kind: 'rename', categoryId: 'a', name: 'Necesidades' }, categories)).toBe(false)
    expect(isCategoryEditorDirty({ kind: 'delete', categoryId: 'a' }, categories)).toBe(false)
  })

  it('is true for a typed create name or a changed rename', () => {
    expect(isCategoryEditorDirty({ kind: 'create', name: 'Lugares' }, categories)).toBe(true)
    expect(isCategoryEditorDirty({ kind: 'rename', categoryId: 'a', name: 'Otra' }, categories)).toBe(true)
    expect(isCategoryEditorDirty({ kind: 'rename', categoryId: 'gone', name: 'Otra' }, categories)).toBe(false)
  })
})
