import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import type {
  ItemCartillaActualizacionRequest,
  ItemCartillaRegistroRequest,
  ItemCartillaResponse,
} from './apiTypes'
import { createBoardItem, deleteBoardItem, updateBoardItem } from './boardItemsApi'

const request: ItemCartillaActualizacionRequest = {
  textoVisible: 'Baño',
  textoHablado: 'Quiero ir al baño',
  ordenVisual: 2,
  recursoGlobalId: 'pic-bano',
  recursoCustomId: null,
  esCore: true,
  visibleEnModoUso: true,
}

const response: ItemCartillaResponse = {
  id: 'i/1',
  categoriaId: 'cat/1',
  textoHablado: 'Quiero ir al baño',
  ordenVisual: 2,
  recursoGlobalId: 'pic-bano',
  recursoCustomId: null,
  creadoEn: '2026-02-01T09:00:00',
  esCore: true,
  textoVisible: 'Baño',
  visibleEnModoUso: true,
}

describe('updateBoardItem', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('issues a single PUT with encoded ids and the request body, returning the response data', async () => {
    const post = vi.spyOn(api, 'post')
    const patch = vi.spyOn(api, 'patch')
    const del = vi.spyOn(api, 'delete')
    const put = vi.spyOn(api, 'put').mockResolvedValue({ data: response })

    await expect(
      updateBoardItem({ patientId: 'p 1', boardId: 'c/1', categoryId: 'cat/1', itemId: 'i/1' }, request),
    ).resolves.toBe(response)

    expect(put).toHaveBeenCalledExactlyOnceWith(
      '/api/pacientes/p%201/cartillas/c%2F1/categorias/cat%2F1/items/i%2F1',
      request,
    )
    expect(post).not.toHaveBeenCalled()
    expect(patch).not.toHaveBeenCalled()
    expect(del).not.toHaveBeenCalled()
  })

  it('propagates request errors', async () => {
    vi.spyOn(api, 'put').mockRejectedValue(new Error('boom'))
    await expect(
      updateBoardItem({ patientId: 'p', boardId: 'c', categoryId: 'k', itemId: 'i' }, request),
    ).rejects.toThrow('boom')
  })
})

describe('createBoardItem', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  const registro: ItemCartillaRegistroRequest = {
    textoVisible: 'Baño',
    textoHablado: 'Quiero ir al baño',
    recursoGlobalId: 'pic-bano',
    recursoCustomId: null,
    esCore: false,
    visibleEnModoUso: true,
  }

  it('issues a single POST to the category items with encoded ids and no ordenVisual', async () => {
    const put = vi.spyOn(api, 'put')
    const patch = vi.spyOn(api, 'patch')
    const del = vi.spyOn(api, 'delete')
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: response })

    await expect(createBoardItem({ patientId: 'p 1', boardId: 'c/1', categoryId: 'cat/1' }, registro)).resolves.toBe(response)

    expect(post).toHaveBeenCalledExactlyOnceWith('/api/pacientes/p%201/cartillas/c%2F1/categorias/cat%2F1/items', registro)
    expect(post.mock.calls[0][1]).not.toHaveProperty('ordenVisual')
    expect(put).not.toHaveBeenCalled()
    expect(patch).not.toHaveBeenCalled()
    expect(del).not.toHaveBeenCalled()
  })

  it('propagates request errors', async () => {
    vi.spyOn(api, 'post').mockRejectedValue(new Error('boom'))
    await expect(createBoardItem({ patientId: 'p', boardId: 'c', categoryId: 'k' }, registro)).rejects.toThrow('boom')
  })
})

describe('deleteBoardItem', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('issues a single DELETE with encoded ids and no body', async () => {
    const post = vi.spyOn(api, 'post')
    const put = vi.spyOn(api, 'put')
    const patch = vi.spyOn(api, 'patch')
    const del = vi.spyOn(api, 'delete').mockResolvedValue({ data: undefined })

    await expect(
      deleteBoardItem({ patientId: 'p 1', boardId: 'c/1', categoryId: 'cat/1', itemId: 'i/1' }),
    ).resolves.toBeUndefined()

    expect(del).toHaveBeenCalledExactlyOnceWith('/api/pacientes/p%201/cartillas/c%2F1/categorias/cat%2F1/items/i%2F1')
    expect(post).not.toHaveBeenCalled()
    expect(put).not.toHaveBeenCalled()
    expect(patch).not.toHaveBeenCalled()
  })

  it('propagates request errors', async () => {
    vi.spyOn(api, 'delete').mockRejectedValue(new Error('boom'))
    await expect(deleteBoardItem({ patientId: 'p', boardId: 'c', categoryId: 'k', itemId: 'i' })).rejects.toThrow('boom')
  })
})
