import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import type { PictogramaGlobalResponse } from './apiTypes'
import { materializePictogram } from './pictogramsApi'

const response: PictogramaGlobalResponse = {
  id: 'uuid-1',
  etiqueta: 'hambre',
  imagenUrl: 'https://static.arasaac.org/pictograms/7272/7272_300.png',
  arasaacId: 7272,
  creadoEn: '2026-02-01T09:00:00',
}

describe('materializePictogram', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('issues a single POST to the materialize endpoint and returns the response data', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: response })
    const put = vi.spyOn(api, 'put')
    const patch = vi.spyOn(api, 'patch')
    const del = vi.spyOn(api, 'delete')
    const get = vi.spyOn(api, 'get')

    await expect(materializePictogram({ arasaacId: 7272, etiqueta: 'hambre' })).resolves.toBe(response)

    expect(post).toHaveBeenCalledExactlyOnceWith('/api/pictogramas-globales/materializar', {
      arasaacId: 7272,
      etiqueta: 'hambre',
    })
    expect(put).not.toHaveBeenCalled()
    expect(patch).not.toHaveBeenCalled()
    expect(del).not.toHaveBeenCalled()
    expect(get).not.toHaveBeenCalled()
  })

  it('propagates request errors', async () => {
    vi.spyOn(api, 'post').mockRejectedValue(new Error('boom'))
    await expect(materializePictogram({ arasaacId: 1, etiqueta: 'x' })).rejects.toThrow('boom')
  })
})
