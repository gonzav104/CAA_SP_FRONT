import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import { AxiosError } from 'axios'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import type { CartillaDetalleResponse, ItemCartillaRegistroRequest } from './apiTypes'
import { boardKeys } from './hooks'
import { BoardOperationError } from './boardOperations'
import { pictogramKeys } from './pictogramHooks'
import { boardDetailResponse, BOARD_ID, PATIENT_ID } from './testing/fixtures'
import type { Pictogram } from './types'
import { useCreateBoardItem } from './useCreateBoardItem'
import type { CreateItemInput } from './useCreateBoardItem'

const MATERIALIZE_PATH = '/api/pictogramas-globales/materializar'
const boardPath = `/api/pacientes/${PATIENT_ID}/cartillas/${BOARD_ID}`
const itemsPath = (categoryId: string) => `${boardPath}/categorias/${categoryId}/items`

const globalPictogram: Pictogram = { id: 'pic-global', label: 'agua', imageUrl: 'https://cdn.example.com/agua.png', kind: 'GLOBAL' }
const customPictogram: Pictogram = { id: 'pic-custom', label: 'mio', imageUrl: 'https://cdn.example.com/mio.png', kind: 'CUSTOM' }
const localPictogram: Pictogram = {
  id: 'arasaac-6156',
  label: 'no quiero',
  imageUrl: '/pictograms/arasaac/6156.png',
  kind: 'LOCAL_MOCK',
}

const input = (pictogram: Pictogram, changes: Partial<CreateItemInput> = {}): CreateItemInput => ({
  categoryId: 'cat-a',
  pictogram,
  label: '  Agua  ',
  spokenText: ' Quiero agua ',
  isActive: true,
  ...changes,
})

/** Server detail that already contains the created item, like the real backend after the POST. */
function detailWithNewItem(): CartillaDetalleResponse {
  const detail = structuredClone(boardDetailResponse)
  detail.categorias[1].items.push({
    id: 'item-new',
    textoHablado: 'Quiero agua',
    ordenVisual: 4,
    pictograma: { id: 'pic-global', etiqueta: 'agua', imagenUrl: 'https://cdn.example.com/agua.png', tipo: 'GLOBAL' },
    esCore: false,
    textoVisible: 'Agua',
    visibleEnModoUso: true,
  })
  return detail
}

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(() => useCreateBoardItem(PATIENT_ID, BOARD_ID), { wrapper })
  return { result, queryClient }
}

function mockApi(options: { itemPost?: () => Promise<unknown>; materialize?: () => Promise<unknown>; get?: () => Promise<unknown> } = {}) {
  const post = vi.spyOn(api, 'post').mockImplementation(async (requestUrl: string, body?: unknown) => {
    if (requestUrl === MATERIALIZE_PATH) {
      if (options.materialize) return options.materialize()
      const { arasaacId, etiqueta } = body as { arasaacId: number; etiqueta: string }
      return {
        data: {
          id: `uuid-${arasaacId}`,
          etiqueta,
          imagenUrl: `https://static.arasaac.org/pictograms/${arasaacId}/${arasaacId}_300.png`,
          arasaacId,
          creadoEn: '2026-02-01T09:00:00',
        },
      }
    }
    if (requestUrl === itemsPath('cat-a')) {
      if (options.itemPost) return options.itemPost()
      return { data: { id: 'item-new' } }
    }
    throw new Error(`Unexpected POST ${requestUrl}`)
  })
  const get = vi
    .spyOn(api, 'get')
    .mockImplementation((options.get ?? (() => Promise.resolve({ data: detailWithNewItem() }))) as never)
  const put = vi.spyOn(api, 'put')
  const del = vi.spyOn(api, 'delete')
  const patch = vi.spyOn(api, 'patch')
  return { post, get, put, del, patch }
}

const bodyOf = (post: { mock: { calls: unknown[][] } }, index: number) => post.mock.calls[index][1] as ItemCartillaRegistroRequest

describe('useCreateBoardItem', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('posts a GLOBAL pictogram directly: one item POST, no materialization, no ordenVisual', async () => {
    const fake = mockApi()
    const { result } = setup()

    await result.current.mutateAsync(input(globalPictogram))

    expect(fake.post).toHaveBeenCalledExactlyOnceWith(itemsPath('cat-a'), {
      textoVisible: 'Agua',
      textoHablado: 'Quiero agua',
      recursoGlobalId: 'pic-global',
      recursoCustomId: null,
      esCore: false,
      visibleEnModoUso: true,
    })
    expect(bodyOf(fake.post, 0)).not.toHaveProperty('ordenVisual')
    expect(fake.put).not.toHaveBeenCalled()
    expect(fake.del).not.toHaveBeenCalled()
    expect(fake.patch).not.toHaveBeenCalled()
  })

  it('sends a CUSTOM pictogram as recursoCustomId and honors the visibility flag', async () => {
    const fake = mockApi()
    const { result } = setup()

    await result.current.mutateAsync(input(customPictogram, { isActive: false }))

    expect(fake.post).toHaveBeenCalledExactlyOnceWith(
      itemsPath('cat-a'),
      expect.objectContaining({ recursoGlobalId: null, recursoCustomId: 'pic-custom', visibleEnModoUso: false, esCore: false }),
    )
  })

  it('materializes a LOCAL_MOCK pictogram once, then posts the item with the returned UUID', async () => {
    const fake = mockApi()
    const { result, queryClient } = setup()
    queryClient.setQueryData(pictogramKeys.global(), [])
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    await result.current.mutateAsync(input(localPictogram))

    expect(fake.post).toHaveBeenCalledTimes(2)
    expect(fake.post.mock.calls[0]).toEqual([MATERIALIZE_PATH, { arasaacId: 6156, etiqueta: 'no quiero' }])
    expect(fake.post.mock.calls[1][0]).toBe(itemsPath('cat-a'))
    expect(bodyOf(fake.post, 1)).toEqual({
      textoVisible: 'Agua',
      textoHablado: 'Quiero agua',
      recursoGlobalId: 'uuid-6156',
      recursoCustomId: null,
      esCore: false,
      visibleEnModoUso: true,
    })
    expect(bodyOf(fake.post, 1)).not.toHaveProperty('ordenVisual')
    expect(invalidate).toHaveBeenCalledExactlyOnceWith({ queryKey: pictogramKeys.global() })
  })

  it('trims and cuts the materialization label to 100 characters', async () => {
    const fake = mockApi()
    const { result } = setup()

    await result.current.mutateAsync(input({ ...localPictogram, label: `  ${'x'.repeat(150)}  ` }))

    expect(fake.post.mock.calls[0][1]).toEqual({ arasaacId: 6156, etiqueta: 'x'.repeat(100) })
  })

  it('does not touch the pictogram library when nothing was materialized', async () => {
    mockApi()
    const { result, queryClient } = setup()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    await result.current.mutateAsync(input(globalPictogram))

    expect(invalidate).not.toHaveBeenCalled()
  })

  it('refetches the board and returns it with the created item, also refreshing the cache', async () => {
    const fake = mockApi()
    const { result, queryClient } = setup()

    const { fresh, createdId } = await result.current.mutateAsync(input(globalPictogram))

    expect(createdId).toBe('item-new')
    expect(fake.get).toHaveBeenCalledExactlyOnceWith(boardPath)
    expect(fresh.items.map((item) => item.id)).toEqual(['item-a2', 'item-a1', 'item-a3', 'item-new', 'item-b1', 'item-b2'])
    expect(fresh.items.find((item) => item.id === 'item-new')).toMatchObject({ categoryId: 'cat-a', serverOrder: 4 })
    expect(queryClient.getQueryData<CartillaDetalleResponse>(boardKeys.detail(PATIENT_ID, BOARD_ID))?.categorias[1].items).toHaveLength(4)
    expect(fake.post.mock.invocationCallOrder[0]).toBeLessThan(fake.get.mock.invocationCallOrder[0])
  })

  it('fails with stage pictogram and sends no item POST when the ARASAAC id cannot be derived', async () => {
    const fake = mockApi()
    const { result } = setup()

    const error = (await result.current
      .mutateAsync(input({ ...localPictogram, id: 'arasaac-abc' }))
      .catch((e: unknown) => e)) as BoardOperationError

    expect(error).toBeInstanceOf(BoardOperationError)
    expect(error.stage).toBe('pictogram')
    expect(fake.post).not.toHaveBeenCalled()
    expect(fake.get).not.toHaveBeenCalled()
  })

  it('fails with stage pictogram, no item POST and no refetch when materialization fails', async () => {
    const failure = new AxiosError('Network Error', 'ERR_NETWORK')
    const fake = mockApi({ materialize: () => Promise.reject(failure) })
    const { result, queryClient } = setup()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    const error = (await result.current.mutateAsync(input(localPictogram)).catch((e: unknown) => e)) as BoardOperationError

    expect(error).toBeInstanceOf(BoardOperationError)
    expect(error.stage).toBe('pictogram')
    expect(error.cause).toBe(failure)
    expect(error.fresh).toBeNull()
    expect(fake.post).toHaveBeenCalledExactlyOnceWith(MATERIALIZE_PATH, expect.anything())
    expect(fake.get).not.toHaveBeenCalled()
    expect(invalidate).not.toHaveBeenCalled()
  })

  it('fails with stage request, without retrying or refetching, when the item POST fails', async () => {
    const failure = new AxiosError('Network Error', 'ERR_NETWORK')
    const fake = mockApi({ itemPost: () => Promise.reject(failure) })
    const { result } = setup()

    const error = (await result.current.mutateAsync(input(globalPictogram)).catch((e: unknown) => e)) as BoardOperationError

    expect(error).toBeInstanceOf(BoardOperationError)
    expect(error.stage).toBe('request')
    expect(error.cause).toBe(failure)
    expect(error.createdId).toBeNull()
    expect(fake.post).toHaveBeenCalledTimes(1)
    expect(fake.get).not.toHaveBeenCalled()
  })

  it('fails with stage reload and the created id when the item exists but the reload fails', async () => {
    const failure = new Error('down')
    const fake = mockApi({ get: () => Promise.reject(failure) })
    const { result } = setup()

    const error = (await result.current.mutateAsync(input(globalPictogram)).catch((e: unknown) => e)) as BoardOperationError

    expect(error).toBeInstanceOf(BoardOperationError)
    expect(error.stage).toBe('reload')
    expect(error.cause).toBe(failure)
    expect(error.createdId).toBe('item-new')
    expect(error.fresh).toBeNull()
    expect(fake.post).toHaveBeenCalledTimes(1)
  })
})
