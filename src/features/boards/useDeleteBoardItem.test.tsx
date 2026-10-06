import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import { AxiosError } from 'axios'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import type { CartillaDetalleResponse } from './apiTypes'
import { boardKeys } from './hooks'
import { ItemOperationError } from './itemOperations'
import { boardDetailResponse, BOARD_ID, PATIENT_ID } from './testing/fixtures'
import { useDeleteBoardItem } from './useDeleteBoardItem'

const boardPath = `/api/pacientes/${PATIENT_ID}/cartillas/${BOARD_ID}`
const target = { categoryId: 'cat-a', itemId: 'item-a1' }

function detailWithoutItem(): CartillaDetalleResponse {
  const detail = structuredClone(boardDetailResponse)
  detail.categorias[1].items = detail.categorias[1].items.filter((item) => item.id !== 'item-a1')
  return detail
}

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(() => useDeleteBoardItem(PATIENT_ID, BOARD_ID), { wrapper })
  return { result, queryClient }
}

function mockGet(impl: () => Promise<unknown> = () => Promise.resolve({ data: detailWithoutItem() })) {
  return vi.spyOn(api, 'get').mockImplementation(impl as never)
}

describe('useDeleteBoardItem', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('deletes the item, refetches the board and returns the fresh one', async () => {
    const del = vi.spyOn(api, 'delete').mockResolvedValue({ data: undefined })
    const get = mockGet()
    const post = vi.spyOn(api, 'post')
    const put = vi.spyOn(api, 'put')
    const { result, queryClient } = setup()

    const fresh = await result.current.mutateAsync(target)

    expect(del).toHaveBeenCalledExactlyOnceWith(`${boardPath}/categorias/cat-a/items/item-a1`)
    expect(get).toHaveBeenCalledExactlyOnceWith(boardPath)
    expect(del.mock.invocationCallOrder[0]).toBeLessThan(get.mock.invocationCallOrder[0])
    expect(fresh.items.map((item) => item.id)).toEqual(['item-a2', 'item-a3', 'item-b1', 'item-b2'])
    expect(queryClient.getQueryData<CartillaDetalleResponse>(boardKeys.detail(PATIENT_ID, BOARD_ID))?.categorias[1].items).toHaveLength(2)
    expect(post).not.toHaveBeenCalled()
    expect(put).not.toHaveBeenCalled()
  })

  it('fails with stage request, keeps the cache and does not refetch when the DELETE fails', async () => {
    const failure = new AxiosError('Network Error', 'ERR_NETWORK')
    vi.spyOn(api, 'delete').mockRejectedValue(failure)
    const get = mockGet()
    const { result, queryClient } = setup()
    queryClient.setQueryData(boardKeys.detail(PATIENT_ID, BOARD_ID), boardDetailResponse)

    const error = (await result.current.mutateAsync(target).catch((e: unknown) => e)) as ItemOperationError

    expect(error).toBeInstanceOf(ItemOperationError)
    expect(error.stage).toBe('request')
    expect(error.cause).toBe(failure)
    expect(error.fresh).toBeNull()
    expect(get).not.toHaveBeenCalled()
    expect(queryClient.getQueryData(boardKeys.detail(PATIENT_ID, BOARD_ID))).toBe(boardDetailResponse)
  })

  it('fails with stage reload when the DELETE succeeded but the reload fails', async () => {
    const failure = new Error('down')
    const del = vi.spyOn(api, 'delete').mockResolvedValue({ data: undefined })
    mockGet(() => Promise.reject(failure))
    const { result } = setup()

    const error = (await result.current.mutateAsync(target).catch((e: unknown) => e)) as ItemOperationError

    expect(error).toBeInstanceOf(ItemOperationError)
    expect(error.stage).toBe('reload')
    expect(error.cause).toBe(failure)
    expect(del).toHaveBeenCalledTimes(1)
  })
})
