import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { AxiosError } from 'axios'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import { boardKeys } from './hooks'
import { pictogramKeys } from './pictogramHooks'
import type { ItemUpdate } from './savePlan'
import { boardDetailResponse, BOARD_ID, PATIENT_ID } from './testing/fixtures'
import { SaveBoardError, useSaveBoard } from './useSaveBoard'

const updates: ItemUpdate[] = ['item-a1', 'item-a2', 'item-b2'].map((itemId, index) => ({
  itemId,
  categoryId: itemId.startsWith('item-a') ? 'cat-a' : 'cat-b',
  request: { textoHablado: `Texto ${index}`, textoVisible: `T${index}`, ordenVisual: index },
  pendingPictogram: null,
}))

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(() => useSaveBoard(PATIENT_ID, BOARD_ID), { wrapper })
  return { result, queryClient }
}

function mockGet(impl: () => Promise<unknown> = () => Promise.resolve({ data: boardDetailResponse })) {
  return vi.spyOn(api, 'get').mockImplementation(impl as never)
}

describe('useSaveBoard', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('sends every PUT, refetches the detail and returns the fresh board', async () => {
    const put = vi.spyOn(api, 'put').mockResolvedValue({ data: {} })
    const get = mockGet()
    const { result, queryClient } = setup()

    const fresh = await result.current.mutateAsync(updates)

    expect(put).toHaveBeenCalledTimes(3)
    expect(put).toHaveBeenCalledWith(
      `/api/pacientes/${PATIENT_ID}/cartillas/${BOARD_ID}/categorias/cat-a/items/item-a1`,
      updates[0].request,
    )
    expect(get).toHaveBeenCalledExactlyOnceWith(`/api/pacientes/${PATIENT_ID}/cartillas/${BOARD_ID}`)
    expect(fresh.items.map((i) => i.id)).toEqual(['item-a2', 'item-a1', 'item-a3', 'item-b1', 'item-b2'])
    expect(queryClient.getQueryData(boardKeys.detail(PATIENT_ID, BOARD_ID))).toBe(boardDetailResponse)
  })

  it('throws SaveBoardError with the failures and the fresh board when one PUT fails', async () => {
    const failure = new AxiosError('Network Error', 'ERR_NETWORK')
    vi.spyOn(api, 'put')
      .mockResolvedValueOnce({ data: {} })
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce({ data: {} })
    mockGet()
    const { result } = setup()

    const error = await result.current.mutateAsync(updates).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(SaveBoardError)
    const saveError = error as SaveBoardError
    expect(saveError.failed).toEqual([{ itemId: 'item-a2', error: failure, stage: 'update' }])
    expect(saveError.total).toBe(3)
    expect(saveError.fresh?.items).toHaveLength(5)
  })

  it('carries fresh: null when the refetch also fails', async () => {
    vi.spyOn(api, 'put').mockRejectedValue(new Error('500'))
    mockGet(() => Promise.reject(new Error('down')))
    const { result } = setup()

    const error = (await result.current.mutateAsync(updates).catch((e: unknown) => e)) as SaveBoardError

    expect(error).toBeInstanceOf(SaveBoardError)
    expect(error.failed).toHaveLength(3)
    expect(error.fresh).toBeNull()
  })

  it('throws with no failed items when every PUT succeeds but the refetch fails', async () => {
    vi.spyOn(api, 'put').mockResolvedValue({ data: {} })
    mockGet(() => Promise.reject(new Error('down')))
    const { result } = setup()

    const error = (await result.current.mutateAsync(updates).catch((e: unknown) => e)) as SaveBoardError

    expect(error).toBeInstanceOf(SaveBoardError)
    expect(error.failed).toEqual([])
    expect(error.fresh).toBeNull()
  })

  it('starts all PUTs before any of them resolves', async () => {
    const resolvers: (() => void)[] = []
    const put = vi.spyOn(api, 'put').mockImplementation(
      () => new Promise((resolve) => resolvers.push(() => resolve({ data: {} }))),
    )
    mockGet()
    const { result } = setup()

    const pending = result.current.mutateAsync(updates)
    await waitFor(() => expect(put).toHaveBeenCalledTimes(3))
    expect(resolvers).toHaveLength(3)

    resolvers.forEach((resolve) => resolve())
    await expect(pending).resolves.toBeDefined()
  })

  describe('local ARASAAC pictograms', () => {
    const pending = (itemId: string, categoryId: string, arasaacId: number | null): ItemUpdate => ({
      itemId,
      categoryId,
      request: { textoHablado: 'Texto', textoVisible: 'T', ordenVisual: 0, recursoGlobalId: null, recursoCustomId: null },
      pendingPictogram: arasaacId === null ? null : { arasaacId, label: `label-${arasaacId}` },
    })
    const putUrl = (categoryId: string, itemId: string) =>
      `/api/pacientes/${PATIENT_ID}/cartillas/${BOARD_ID}/categorias/${categoryId}/items/${itemId}`
    const materialized = (arasaacId: number) => ({
      data: {
        id: `uuid-${arasaacId}`,
        etiqueta: `label-${arasaacId}`,
        imagenUrl: `https://static.arasaac.org/pictograms/${arasaacId}/${arasaacId}_300.png`,
        arasaacId,
        creadoEn: '2026-02-01T09:00:00',
      },
    })
    const putBody = (put: { mock: { calls: unknown[][] } }, index: number) =>
      put.mock.calls[index][1] as { recursoGlobalId?: string | null; recursoCustomId?: string | null }

    it('sends only PUTs and never POSTs for real pictograms', async () => {
      const post = vi.spyOn(api, 'post')
      const put = vi.spyOn(api, 'put').mockResolvedValue({ data: {} })
      mockGet()
      const { result } = setup()

      await result.current.mutateAsync(updates)

      expect(put).toHaveBeenCalledTimes(3)
      expect(post).not.toHaveBeenCalled()
    })

    it('materializes first, then sends the PUT with the returned UUID', async () => {
      const post = vi.spyOn(api, 'post').mockResolvedValue(materialized(7272))
      const put = vi.spyOn(api, 'put').mockResolvedValue({ data: {} })
      mockGet()
      const { result } = setup()

      await result.current.mutateAsync([pending('item-a1', 'cat-a', 7272)])

      expect(post).toHaveBeenCalledExactlyOnceWith('/api/pictogramas-globales/materializar', {
        arasaacId: 7272,
        etiqueta: 'label-7272',
      })
      expect(put).toHaveBeenCalledExactlyOnceWith(putUrl('cat-a', 'item-a1'), expect.anything())
      expect(putBody(put, 0)).toMatchObject({ recursoGlobalId: 'uuid-7272', recursoCustomId: null })
      expect(post.mock.invocationCallOrder[0]).toBeLessThan(put.mock.invocationCallOrder[0])
    })

    it('materializes once per distinct id and shares the UUID between items', async () => {
      const post = vi.spyOn(api, 'post').mockImplementation(async (_url: string, body?: unknown) =>
        materialized((body as { arasaacId: number }).arasaacId),
      )
      const put = vi.spyOn(api, 'put').mockResolvedValue({ data: {} })
      mockGet()
      const { result } = setup()

      await result.current.mutateAsync([
        pending('item-a1', 'cat-a', 7272),
        pending('item-a2', 'cat-a', 7272),
        pending('item-b2', 'cat-b', 7272),
        pending('item-a3', 'cat-a', null),
      ])
      expect(post).toHaveBeenCalledTimes(1)
      expect(put).toHaveBeenCalledTimes(4)
      expect([0, 1, 2].map((index) => putBody(put, index).recursoGlobalId)).toEqual(['uuid-7272', 'uuid-7272', 'uuid-7272'])
      expect(putBody(put, 3)).toMatchObject({ recursoGlobalId: null, recursoCustomId: null })

      post.mockClear()
      await result.current.mutateAsync([pending('item-a1', 'cat-a', 7272), pending('item-a2', 'cat-a', 7273)])
      expect(post).toHaveBeenCalledTimes(2)
      expect(post.mock.calls.map(([, body]) => (body as { arasaacId: number }).arasaacId).sort()).toEqual([7272, 7273])
    })

    it('does not POST for updates without a pending pictogram', async () => {
      const post = vi.spyOn(api, 'post')
      vi.spyOn(api, 'put').mockResolvedValue({ data: {} })
      mockGet()
      const { result } = setup()

      await result.current.mutateAsync([pending('item-a1', 'cat-a', null)])

      expect(post).not.toHaveBeenCalled()
    })

    it('skips the PUT of an item whose pictogram failed, still sends the others and reloads', async () => {
      const failure = new AxiosError('Network Error', 'ERR_NETWORK')
      vi.spyOn(api, 'post').mockImplementation(async (_url: string, body?: unknown) => {
        const { arasaacId } = body as { arasaacId: number }
        if (arasaacId === 7273) throw failure
        return materialized(arasaacId)
      })
      const put = vi.spyOn(api, 'put').mockResolvedValue({ data: {} })
      const get = mockGet()
      const { result } = setup()

      const error = (await result.current
        .mutateAsync([pending('item-a1', 'cat-a', 7272), pending('item-a2', 'cat-a', 7273), pending('item-b2', 'cat-b', null)])
        .catch((e: unknown) => e)) as SaveBoardError

      expect(error).toBeInstanceOf(SaveBoardError)
      expect(error.failed).toEqual([{ itemId: 'item-a2', error: failure, stage: 'pictogram' }])
      expect(error.total).toBe(3)
      expect(error.fresh?.items).toHaveLength(5)
      expect(put.mock.calls.map(([requestUrl]) => requestUrl)).toEqual([
        putUrl('cat-a', 'item-a1'),
        putUrl('cat-b', 'item-b2'),
      ])
      expect(get).toHaveBeenCalledTimes(1)
    })

    it('records PUT failures of materialized items with the update stage', async () => {
      vi.spyOn(api, 'post').mockResolvedValue(materialized(7272))
      const failure = new Error('500')
      vi.spyOn(api, 'put').mockRejectedValue(failure)
      mockGet()
      const { result } = setup()

      const error = (await result.current.mutateAsync([pending('item-a1', 'cat-a', 7272)]).catch((e: unknown) => e)) as SaveBoardError

      expect(error.failed).toEqual([{ itemId: 'item-a1', error: failure, stage: 'update' }])
    })

    it('invalidates the global library after materializing, so the new rows are used next time', async () => {
      vi.spyOn(api, 'post').mockResolvedValue(materialized(7272))
      vi.spyOn(api, 'put').mockResolvedValue({ data: {} })
      mockGet()
      const { result, queryClient } = setup()
      queryClient.setQueryData(pictogramKeys.global(), [])
      const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

      await result.current.mutateAsync([pending('item-a1', 'cat-a', 7272)])

      expect(invalidate).toHaveBeenCalledExactlyOnceWith({ queryKey: pictogramKeys.global() })
      expect(queryClient.getQueryState(pictogramKeys.global())?.isInvalidated).toBe(true)
    })

    it('does not touch the global library when nothing was materialized', async () => {
      vi.spyOn(api, 'put').mockResolvedValue({ data: {} })
      mockGet()
      const { result, queryClient } = setup()
      const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

      await result.current.mutateAsync(updates)

      expect(invalidate).not.toHaveBeenCalled()
    })

    it('does not touch the global library when every materialization failed', async () => {
      vi.spyOn(api, 'post').mockRejectedValue(new Error('boom'))
      vi.spyOn(api, 'put').mockResolvedValue({ data: {} })
      mockGet()
      const { result, queryClient } = setup()
      const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

      await result.current.mutateAsync([pending('item-a1', 'cat-a', 7272)]).catch(() => undefined)

      expect(invalidate).not.toHaveBeenCalled()
    })

    it('returns the reloaded board with the real GLOBAL pictogram after a successful save', async () => {
      vi.spyOn(api, 'post').mockResolvedValue(materialized(7272))
      vi.spyOn(api, 'put').mockImplementation(async (_url: string, body?: unknown) => {
        const uuid = (body as { recursoGlobalId: string }).recursoGlobalId
        const item = server.categorias.flatMap((c) => c.items).find((i) => i.id === 'item-a1')
        if (item) {
          item.pictograma = { id: uuid, etiqueta: 'hambre', imagenUrl: 'https://static.arasaac.org/pictograms/7272/7272_300.png', tipo: 'GLOBAL' }
        }
        return { data: {} }
      })
      const server = structuredClone(boardDetailResponse)
      mockGet(() => Promise.resolve({ data: structuredClone(server) }))
      const { result, queryClient } = setup()

      const fresh = await result.current.mutateAsync([pending('item-a1', 'cat-a', 7272)])

      const item = fresh.items.find((i) => i.id === 'item-a1')
      expect(item?.pictogram).toMatchObject({ kind: 'GLOBAL', id: 'uuid-7272' })
      expect(queryClient.getQueryData(boardKeys.detail(PATIENT_ID, BOARD_ID))).toMatchObject({ id: BOARD_ID })
    })
  })
})
