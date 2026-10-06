import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { AxiosError } from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchBoards } from './boardsApi'
import { createBoard, deleteBoard, renameBoard, setPrimaryBoard } from './boardsWriteApi'
import { CartillaOperationError } from './cartillaOperations'
import { boardKeys } from './hooks'
import { boardsListResponse, PATIENT_ID } from './testing/fixtures'
import { useBoardListOperations } from './useBoardListOperations'

vi.mock('./boardsApi')
vi.mock('./boardsWriteApi')

function httpError(status: number): AxiosError {
  const config = { headers: {} } as InternalAxiosRequestConfig
  return new AxiosError('failed', 'ERR_BAD_REQUEST', config, null, {
    status,
    statusText: '',
    headers: {},
    config,
    data: {},
  })
}

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  const remove = vi.spyOn(queryClient, 'removeQueries')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(() => useBoardListOperations(PATIENT_ID), { wrapper })
  return { queryClient, invalidate, remove, result }
}

async function expectFailure(promise: Promise<unknown>): Promise<CartillaOperationError> {
  const error = await promise.then(
    () => null,
    (failure: unknown) => failure,
  )
  expect(error).toBeInstanceOf(CartillaOperationError)
  return error as CartillaOperationError
}

describe('useBoardListOperations', () => {
  beforeEach(() => {
    vi.mocked(fetchBoards).mockReset().mockResolvedValue(boardsListResponse)
    vi.mocked(createBoard).mockReset().mockResolvedValue(boardsListResponse[0])
    vi.mocked(renameBoard).mockReset().mockResolvedValue(boardsListResponse[0])
    vi.mocked(setPrimaryBoard).mockReset().mockResolvedValue(boardsListResponse[0])
    vi.mocked(deleteBoard).mockReset().mockResolvedValue(undefined)
  })

  describe('success', () => {
    it('create writes only the trimmed name, reloads the list into the cache and resolves to the fresh summaries', async () => {
      const { queryClient, invalidate, remove, result } = setup()

      let fresh: unknown
      await act(async () => {
        fresh = await result.current.create.mutateAsync('  Nueva  ')
      })

      expect(createBoard).toHaveBeenCalledExactlyOnceWith(PATIENT_ID, { nombre: 'Nueva' })
      expect(fetchBoards).toHaveBeenCalledExactlyOnceWith(PATIENT_ID)
      expect(queryClient.getQueryData(boardKeys.list(PATIENT_ID))).toBe(boardsListResponse)
      // Principal first, then oldest first.
      expect((fresh as { name: string }[]).map((board) => board.name)).toEqual(['Principal', 'Casa', 'Paseo', 'Escuela'])
      expect(invalidate).not.toHaveBeenCalled()
      expect(remove).not.toHaveBeenCalled()
    })

    it('rename reloads the list and invalidates only that detail', async () => {
      const { invalidate, remove, result } = setup()

      await act(async () => {
        await result.current.rename.mutateAsync({ boardId: 'c-2', name: 'Hogar' })
      })

      expect(renameBoard).toHaveBeenCalledExactlyOnceWith(PATIENT_ID, 'c-2', { nombre: 'Hogar' })
      expect(fetchBoards).toHaveBeenCalledOnce()
      expect(invalidate).toHaveBeenCalledExactlyOnceWith({ queryKey: boardKeys.detail(PATIENT_ID, 'c-2') })
      expect(remove).not.toHaveBeenCalled()
    })

    it('setPrimary sends exactly one write, reloads the list and invalidates every detail of the patient', async () => {
      const { invalidate, remove, result } = setup()

      await act(async () => {
        await result.current.setPrimary.mutateAsync('c-4')
      })

      expect(setPrimaryBoard).toHaveBeenCalledExactlyOnceWith(PATIENT_ID, 'c-4')
      expect(renameBoard).not.toHaveBeenCalled()
      expect(fetchBoards).toHaveBeenCalledOnce()
      expect(invalidate).toHaveBeenCalledExactlyOnceWith({ queryKey: [...boardKeys.patient(PATIENT_ID), 'detail'] })
      expect(remove).not.toHaveBeenCalled()
    })

    it('remove reloads the list and removes only that detail from the cache', async () => {
      const { invalidate, remove, result } = setup()

      await act(async () => {
        await result.current.remove.mutateAsync('c-4')
      })

      expect(deleteBoard).toHaveBeenCalledExactlyOnceWith(PATIENT_ID, 'c-4')
      expect(fetchBoards).toHaveBeenCalledOnce()
      expect(remove).toHaveBeenCalledExactlyOnceWith({ queryKey: boardKeys.detail(PATIENT_ID, 'c-4') })
      expect(invalidate).not.toHaveBeenCalled()
    })

    it('keeps the list key and the detail key shapes under the patient prefix', () => {
      expect(boardKeys.list('p')).toEqual([...boardKeys.patient('p'), 'list'])
      expect(boardKeys.detail('p', 'c')).toEqual([...boardKeys.patient('p'), 'detail', 'c'])
    })
  })

  describe('failed write', () => {
    it('wraps the failure as a request stage error and does not reload for other statuses', async () => {
      vi.mocked(createBoard).mockRejectedValue(httpError(400))
      const { invalidate, result } = setup()

      let failure: CartillaOperationError | undefined
      await act(async () => {
        failure = await expectFailure(result.current.create.mutateAsync('x'))
      })

      expect(failure?.operation).toBe('create')
      expect(failure?.stage).toBe('request')
      expect(failure?.cause).toBeInstanceOf(AxiosError)
      expect(fetchBoards).not.toHaveBeenCalled()
      expect(invalidate).not.toHaveBeenCalled()
    })

    it('does not reload after a network error', async () => {
      vi.mocked(renameBoard).mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'))
      const { result } = setup()

      await act(async () => {
        await expectFailure(result.current.rename.mutateAsync({ boardId: 'c-2', name: 'x' }))
      })

      expect(fetchBoards).not.toHaveBeenCalled()
    })

    it.each([404, 409])('reloads the list best-effort after a %i on rename', async (status) => {
      vi.mocked(renameBoard).mockRejectedValue(httpError(status))
      const { queryClient, invalidate, result } = setup()

      let failure: CartillaOperationError | undefined
      await act(async () => {
        failure = await expectFailure(result.current.rename.mutateAsync({ boardId: 'c-2', name: 'x' }))
      })

      expect(failure?.stage).toBe('request')
      expect(fetchBoards).toHaveBeenCalledOnce()
      expect(queryClient.getQueryData(boardKeys.list(PATIENT_ID))).toBe(boardsListResponse)
      expect(invalidate).not.toHaveBeenCalled()
    })

    it.each([404, 409])('reloads the list best-effort after a %i on delete and create', async (status) => {
      vi.mocked(deleteBoard).mockRejectedValue(httpError(status))
      vi.mocked(createBoard).mockRejectedValue(httpError(status))
      const { remove, result } = setup()

      await act(async () => {
        await expectFailure(result.current.remove.mutateAsync('c-4'))
        await expectFailure(result.current.create.mutateAsync('x'))
      })

      expect(fetchBoards).toHaveBeenCalledTimes(2)
      expect(remove).not.toHaveBeenCalled()
    })

    it('swallows a failed best-effort reload and still reports the original write failure', async () => {
      const original = httpError(409)
      vi.mocked(renameBoard).mockRejectedValue(original)
      vi.mocked(fetchBoards).mockRejectedValue(new Error('down'))
      const { result } = setup()

      let failure: CartillaOperationError | undefined
      await act(async () => {
        failure = await expectFailure(result.current.rename.mutateAsync({ boardId: 'c-2', name: 'x' }))
      })

      expect(failure?.stage).toBe('request')
      expect(failure?.cause).toBe(original)
    })

    it.each([403, 404, 409, 500])('setPrimary ALWAYS reloads the list after a %i', async (status) => {
      vi.mocked(setPrimaryBoard).mockRejectedValue(httpError(status))
      const { invalidate, result } = setup()

      let failure: CartillaOperationError | undefined
      await act(async () => {
        failure = await expectFailure(result.current.setPrimary.mutateAsync('c-4'))
      })

      expect(failure?.operation).toBe('primary')
      expect(failure?.stage).toBe('request')
      expect(setPrimaryBoard).toHaveBeenCalledOnce()
      expect(fetchBoards).toHaveBeenCalledOnce()
      expect(invalidate).not.toHaveBeenCalled()
    })

    it('setPrimary does not reload after a network error', async () => {
      vi.mocked(setPrimaryBoard).mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'))
      const { result } = setup()

      await act(async () => {
        await expectFailure(result.current.setPrimary.mutateAsync('c-4'))
      })

      expect(fetchBoards).not.toHaveBeenCalled()
    })
  })

  describe('failed reload after a successful write', () => {
    it.each([
      ['create', (r: ReturnType<typeof setup>['result']) => r.current.create.mutateAsync('x')],
      ['rename', (r: ReturnType<typeof setup>['result']) => r.current.rename.mutateAsync({ boardId: 'c-2', name: 'x' })],
      ['primary', (r: ReturnType<typeof setup>['result']) => r.current.setPrimary.mutateAsync('c-4')],
      ['delete', (r: ReturnType<typeof setup>['result']) => r.current.remove.mutateAsync('c-4')],
    ])('%s throws a reload stage error and skips the cache cleanup', async (operation, run) => {
      const reloadFailure = new Error('down')
      vi.mocked(fetchBoards).mockRejectedValue(reloadFailure)
      const { invalidate, remove, result } = setup()

      let failure: CartillaOperationError | undefined
      await act(async () => {
        failure = await expectFailure(run(result))
      })

      expect(failure?.operation).toBe(operation)
      expect(failure?.stage).toBe('reload')
      expect(failure?.cause).toBe(reloadFailure)
      expect(invalidate).not.toHaveBeenCalled()
      expect(remove).not.toHaveBeenCalled()
    })
  })
})
