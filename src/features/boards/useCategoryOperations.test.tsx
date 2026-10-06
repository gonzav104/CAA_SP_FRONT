import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import { AxiosError } from 'axios'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import type { CartillaDetalleResponse } from './apiTypes'
import { BoardOperationError } from './boardOperations'
import { boardKeys } from './hooks'
import { toBoard } from './mappers'
import { boardDetailResponse, BOARD_ID, PATIENT_ID } from './testing/fixtures'
import { useCategoryOperations } from './useCategoryOperations'

const boardPath = `/api/pacientes/${PATIENT_ID}/cartillas/${BOARD_ID}`
const categoriesPath = `${boardPath}/categorias`
const categories = toBoard(boardDetailResponse).categories
const necesidades = categories[0]
const acciones = categories[1]

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(() => useCategoryOperations(PATIENT_ID, BOARD_ID), { wrapper })
  return { result, queryClient }
}

function mockGet(detail: CartillaDetalleResponse = boardDetailResponse) {
  return vi.spyOn(api, 'get').mockImplementation((() => Promise.resolve({ data: detail })) as never)
}

const networkError = () => new AxiosError('Network Error', 'ERR_NETWORK')

async function failure(promise: Promise<unknown>): Promise<BoardOperationError> {
  const error = await promise.catch((e: unknown) => e)
  expect(error).toBeInstanceOf(BoardOperationError)
  return error as BoardOperationError
}

describe('useCategoryOperations.create', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('POSTs the trimmed name with the default color and no orden, then reloads and returns the fresh board', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { id: 'new' } })
    const get = mockGet()
    const put = vi.spyOn(api, 'put')
    const del = vi.spyOn(api, 'delete')
    const { result, queryClient } = setup()

    const fresh = await result.current.create.mutateAsync('  Lugares ')

    expect(post).toHaveBeenCalledExactlyOnceWith(categoriesPath, { nombre: 'Lugares', colorHex: '#E0E0E0' })
    expect(post.mock.calls[0][1]).not.toHaveProperty('orden')
    expect(get).toHaveBeenCalledExactlyOnceWith(boardPath)
    expect(post.mock.invocationCallOrder[0]).toBeLessThan(get.mock.invocationCallOrder[0])
    expect(fresh.categories.map((category) => category.id)).toEqual(['cat-a', 'cat-b'])
    expect(queryClient.getQueryData(boardKeys.detail(PATIENT_ID, BOARD_ID))).toBe(boardDetailResponse)
    expect(put).not.toHaveBeenCalled()
    expect(del).not.toHaveBeenCalled()
  })

  it('fails with stage request and does not reload when the POST fails', async () => {
    const cause = networkError()
    vi.spyOn(api, 'post').mockRejectedValue(cause)
    const get = mockGet()
    const { result } = setup()

    const error = await failure(result.current.create.mutateAsync('Lugares'))

    expect(error.stage).toBe('request')
    expect(error.cause).toBe(cause)
    expect(error.fresh).toBeNull()
    expect(get).not.toHaveBeenCalled()
  })

  it('fails with stage reload when the POST succeeded but the reload fails', async () => {
    const cause = new Error('down')
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { id: 'new' } })
    vi.spyOn(api, 'get').mockRejectedValue(cause)
    const { result } = setup()

    const error = await failure(result.current.create.mutateAsync('Lugares'))

    expect(error.stage).toBe('reload')
    expect(error.cause).toBe(cause)
    expect(post).toHaveBeenCalledTimes(1)
  })
})

describe('useCategoryOperations.rename', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('PUTs the trimmed name with the current color and no orden, then reloads', async () => {
    const put = vi.spyOn(api, 'put').mockResolvedValue({ data: { id: 'cat-b' } })
    const get = mockGet()
    const post = vi.spyOn(api, 'post')
    const { result } = setup()

    const fresh = await result.current.rename.mutateAsync({ category: acciones, name: ' Verbos ' })

    expect(put).toHaveBeenCalledExactlyOnceWith(`${categoriesPath}/cat-b`, { nombre: 'Verbos', colorHex: '#22AA55' })
    expect(put.mock.calls[0][1]).not.toHaveProperty('orden')
    expect(put.mock.invocationCallOrder[0]).toBeLessThan(get.mock.invocationCallOrder[0])
    expect(fresh.id).toBe(BOARD_ID)
    expect(post).not.toHaveBeenCalled()
  })

  it('fails with stage request without reloading, and with stage reload when only the reload fails', async () => {
    const cause = networkError()
    const put = vi.spyOn(api, 'put').mockRejectedValue(cause)
    const get = mockGet()
    const { result } = setup()

    const requestError = await failure(result.current.rename.mutateAsync({ category: acciones, name: 'Verbos' }))
    expect(requestError.stage).toBe('request')
    expect(requestError.cause).toBe(cause)
    expect(get).not.toHaveBeenCalled()

    put.mockResolvedValue({ data: { id: 'cat-b' } })
    get.mockRejectedValue(new Error('down'))
    const reloadError = await failure(result.current.rename.mutateAsync({ category: acciones, name: 'Verbos' }))
    expect(reloadError.stage).toBe('reload')
  })
})

describe('useCategoryOperations.move', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('resends name and color with the swapped orden in two parallel PUTs, then reloads', async () => {
    const put = vi.spyOn(api, 'put').mockResolvedValue({ data: {} })
    const get = mockGet()
    const { result } = setup()

    const fresh = await result.current.move.mutateAsync({ categories, categoryId: 'cat-b', direction: -1 })

    expect(put).toHaveBeenCalledTimes(2)
    expect(put).toHaveBeenCalledWith(`${categoriesPath}/cat-b`, { nombre: 'Acciones', colorHex: '#22AA55', orden: 0 })
    expect(put).toHaveBeenCalledWith(`${categoriesPath}/cat-a`, { nombre: 'Necesidades', colorHex: '#3366FF', orden: 1 })
    expect(Math.max(...put.mock.invocationCallOrder)).toBeLessThan(get.mock.invocationCallOrder[0])
    expect(fresh.id).toBe(BOARD_ID)
  })

  it('renumbers only the changed values on a tie', async () => {
    const put = vi.spyOn(api, 'put').mockResolvedValue({ data: {} })
    mockGet()
    const tied = [
      { ...necesidades, order: 0 },
      { ...acciones, order: 0 },
      { id: 'cat-c', name: 'Lugares', order: 1, colorHex: '#000000' },
    ]
    const { result } = setup()

    await result.current.move.mutateAsync({ categories: tied, categoryId: 'cat-b', direction: -1 })

    expect(put).toHaveBeenCalledTimes(2)
    expect(put).toHaveBeenCalledWith(`${categoriesPath}/cat-a`, { nombre: 'Necesidades', colorHex: '#3366FF', orden: 1 })
    expect(put).toHaveBeenCalledWith(`${categoriesPath}/cat-c`, { nombre: 'Lugares', colorHex: '#000000', orden: 2 })
  })

  it('still reloads when one PUT fails and throws stage request carrying the fresh board', async () => {
    const cause = networkError()
    const put = vi.spyOn(api, 'put').mockImplementation((async (requestUrl: string) => {
      if (requestUrl.endsWith('/cat-a')) throw cause
      return { data: {} }
    }) as never)
    const get = mockGet()
    const { result } = setup()

    const error = await failure(result.current.move.mutateAsync({ categories, categoryId: 'cat-b', direction: -1 }))

    expect(put).toHaveBeenCalledTimes(2)
    expect(get).toHaveBeenCalledTimes(1)
    expect(error.stage).toBe('request')
    expect(error.cause).toBe(cause)
    expect(error.fresh?.id).toBe(BOARD_ID)
  })

  it('throws stage request without fresh when a PUT fails and the reload fails too', async () => {
    vi.spyOn(api, 'put').mockRejectedValue(networkError())
    vi.spyOn(api, 'get').mockRejectedValue(new Error('down'))
    const { result } = setup()

    const error = await failure(result.current.move.mutateAsync({ categories, categoryId: 'cat-b', direction: -1 }))

    expect(error.stage).toBe('request')
    expect(error.fresh).toBeNull()
  })

  it('throws stage reload when every PUT succeeded but the reload fails', async () => {
    vi.spyOn(api, 'put').mockResolvedValue({ data: {} })
    const cause = new Error('down')
    vi.spyOn(api, 'get').mockRejectedValue(cause)
    const { result } = setup()

    const error = await failure(result.current.move.mutateAsync({ categories, categoryId: 'cat-b', direction: -1 }))

    expect(error.stage).toBe('reload')
    expect(error.cause).toBe(cause)
    expect(error.fresh).toBeNull()
  })

  it('sends no PUT at an edge and just reloads', async () => {
    const put = vi.spyOn(api, 'put')
    const get = mockGet()
    const { result } = setup()

    await result.current.move.mutateAsync({ categories, categoryId: 'cat-a', direction: -1 })

    expect(put).not.toHaveBeenCalled()
    expect(get).toHaveBeenCalledTimes(1)
  })
})

describe('useCategoryOperations.remove', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('DELETEs the category, then reloads and returns the fresh board', async () => {
    const detail = structuredClone(boardDetailResponse)
    detail.categorias = detail.categorias.filter((category) => category.id !== 'cat-b')
    const del = vi.spyOn(api, 'delete').mockResolvedValue({ data: undefined })
    const get = mockGet(detail)
    const post = vi.spyOn(api, 'post')
    const put = vi.spyOn(api, 'put')
    const { result } = setup()

    const fresh = await result.current.remove.mutateAsync(acciones)

    expect(del).toHaveBeenCalledExactlyOnceWith(`${categoriesPath}/cat-b`)
    expect(del.mock.invocationCallOrder[0]).toBeLessThan(get.mock.invocationCallOrder[0])
    expect(fresh.categories.map((category) => category.id)).toEqual(['cat-a'])
    expect(fresh.items.every((item) => item.categoryId === 'cat-a')).toBe(true)
    expect(post).not.toHaveBeenCalled()
    expect(put).not.toHaveBeenCalled()
  })

  it('fails with stage request without reloading, and with stage reload when only the reload fails', async () => {
    const cause = networkError()
    const del = vi.spyOn(api, 'delete').mockRejectedValue(cause)
    const get = mockGet()
    const { result } = setup()

    const requestError = await failure(result.current.remove.mutateAsync(acciones))
    expect(requestError.stage).toBe('request')
    expect(requestError.cause).toBe(cause)
    expect(get).not.toHaveBeenCalled()

    del.mockResolvedValue({ data: undefined })
    get.mockRejectedValue(new Error('down'))
    const reloadError = await failure(result.current.remove.mutateAsync(acciones))
    expect(reloadError.stage).toBe('reload')
  })
})
