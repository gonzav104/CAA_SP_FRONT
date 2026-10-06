import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import type { ItemCartillaActualizacionRequest, ItemCartillaResponse } from './apiTypes'
import { updateBoardItem } from './boardItemsApi'

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
