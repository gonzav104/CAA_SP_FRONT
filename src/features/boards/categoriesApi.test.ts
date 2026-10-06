import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import type { CategoriaResponse } from './apiTypes'
import { createCategory, deleteCategory, updateCategory } from './categoriesApi'

const response: CategoriaResponse = {
  id: 'k/1',
  cartillaId: 'c/1',
  nombre: 'Lugares',
  colorHex: '#E0E0E0',
  orden: 3,
  creadoEn: null,
}

const BASE = '/api/pacientes/p%201/cartillas/c%2F1/categorias'

describe('createCategory', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('issues a single POST with encoded ids, the color and no orden, returning the response data', async () => {
    const put = vi.spyOn(api, 'put')
    const patch = vi.spyOn(api, 'patch')
    const del = vi.spyOn(api, 'delete')
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: response })
    const request = { nombre: 'Lugares', colorHex: '#E0E0E0' }

    await expect(createCategory({ patientId: 'p 1', boardId: 'c/1' }, request)).resolves.toBe(response)

    expect(post).toHaveBeenCalledExactlyOnceWith(BASE, request)
    expect(post.mock.calls[0][1]).not.toHaveProperty('orden')
    expect(put).not.toHaveBeenCalled()
    expect(patch).not.toHaveBeenCalled()
    expect(del).not.toHaveBeenCalled()
  })

  it('propagates request errors', async () => {
    vi.spyOn(api, 'post').mockRejectedValue(new Error('boom'))
    await expect(createCategory({ patientId: 'p', boardId: 'c' }, { nombre: 'x', colorHex: '#E0E0E0' })).rejects.toThrow('boom')
  })
})

describe('updateCategory', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('issues a single PUT with encoded ids and the full body', async () => {
    const post = vi.spyOn(api, 'post')
    const patch = vi.spyOn(api, 'patch')
    const del = vi.spyOn(api, 'delete')
    const put = vi.spyOn(api, 'put').mockResolvedValue({ data: response })
    const request = { nombre: 'Lugares', colorHex: '#22AA55', orden: 4 }

    await expect(updateCategory({ patientId: 'p 1', boardId: 'c/1', categoryId: 'k/1' }, request)).resolves.toBe(response)

    expect(put).toHaveBeenCalledExactlyOnceWith(`${BASE}/k%2F1`, request)
    expect(post).not.toHaveBeenCalled()
    expect(patch).not.toHaveBeenCalled()
    expect(del).not.toHaveBeenCalled()
  })

  it('propagates request errors', async () => {
    vi.spyOn(api, 'put').mockRejectedValue(new Error('boom'))
    await expect(
      updateCategory({ patientId: 'p', boardId: 'c', categoryId: 'k' }, { nombre: 'x', colorHex: '#E0E0E0' }),
    ).rejects.toThrow('boom')
  })
})

describe('deleteCategory', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('issues a single DELETE with encoded ids and no body', async () => {
    const post = vi.spyOn(api, 'post')
    const put = vi.spyOn(api, 'put')
    const patch = vi.spyOn(api, 'patch')
    const del = vi.spyOn(api, 'delete').mockResolvedValue({ data: undefined })

    await expect(deleteCategory({ patientId: 'p 1', boardId: 'c/1', categoryId: 'k/1' })).resolves.toBeUndefined()

    expect(del).toHaveBeenCalledExactlyOnceWith(`${BASE}/k%2F1`)
    expect(post).not.toHaveBeenCalled()
    expect(put).not.toHaveBeenCalled()
    expect(patch).not.toHaveBeenCalled()
  })

  it('propagates request errors', async () => {
    vi.spyOn(api, 'delete').mockRejectedValue(new Error('boom'))
    await expect(deleteCategory({ patientId: 'p', boardId: 'c', categoryId: 'k' })).rejects.toThrow('boom')
  })
})
