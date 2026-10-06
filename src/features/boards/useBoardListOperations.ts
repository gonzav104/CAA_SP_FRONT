import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getErrorStatus } from '@/api/errors'
import { CartillaOperationError, reloadBoardList } from './cartillaOperations'
import type { CartillaOperation } from './cartillaOperations'
import { createBoard, deleteBoard, renameBoard, setPrimaryBoard } from './boardsWriteApi'
import { boardKeys } from './hooks'
import { toBoardSummaries } from './mappers'
import type { BoardSummary } from './types'

export interface RenameBoardInput {
  boardId: string
  name: string
}

/**
 * The cartilla list operations. Each one writes, then reloads the list (the returned fresh `BoardSummary[]`)
 * so the cache and the screen match the server. No optimistic updates and no automatic retries; every
 * failure is a `CartillaOperationError`: `request` = the write failed, `reload` = the write succeeded but
 * the list reload failed.
 *
 * - A failed write answered 404 or 409 also tries a best-effort reload, so the UI shows the server truth.
 *   For `primary` the reload runs after a failure with ANY HTTP status (the principal may have changed).
 * - create / rename send only `nombre`; setPrimary is exactly one PUT to `/principal`.
 * - After a successful reload: rename invalidates that detail, primary invalidates every detail of the
 *   patient, delete removes that detail from the cache.
 */
export function useBoardListOperations(patientId: string) {
  const queryClient = useQueryClient()

  const reload = () => reloadBoardList(queryClient, patientId)

  const run = async (
    operation: CartillaOperation,
    write: () => Promise<unknown>,
    afterReload?: () => void,
  ): Promise<BoardSummary[]> => {
    try {
      await write()
    } catch (error) {
      const status = getErrorStatus(error)
      const shouldReload = operation === 'primary' ? status !== undefined : status === 404 || status === 409
      if (shouldReload) {
        try {
          await reload()
        } catch {
          // Best effort: the original failure is what gets reported.
        }
      }
      throw new CartillaOperationError(operation, 'request', error)
    }

    let fresh: BoardSummary[]
    try {
      fresh = toBoardSummaries(await reload())
    } catch (error) {
      throw new CartillaOperationError(operation, 'reload', error)
    }
    afterReload?.()
    return fresh
  }

  const create = useMutation<BoardSummary[], CartillaOperationError, string>({
    mutationFn: (name) => run('create', () => createBoard(patientId, { nombre: name.trim() })),
  })

  const rename = useMutation<BoardSummary[], CartillaOperationError, RenameBoardInput>({
    mutationFn: ({ boardId, name }) =>
      run(
        'rename',
        () => renameBoard(patientId, boardId, { nombre: name.trim() }),
        () => void queryClient.invalidateQueries({ queryKey: boardKeys.detail(patientId, boardId) }),
      ),
  })

  const setPrimary = useMutation<BoardSummary[], CartillaOperationError, string>({
    mutationFn: (boardId) =>
      run(
        'primary',
        () => setPrimaryBoard(patientId, boardId),
        () => void queryClient.invalidateQueries({ queryKey: [...boardKeys.patient(patientId), 'detail'] }),
      ),
  })

  const remove = useMutation<BoardSummary[], CartillaOperationError, string>({
    mutationFn: (boardId) =>
      run(
        'delete',
        () => deleteBoard(patientId, boardId),
        () => queryClient.removeQueries({ queryKey: boardKeys.detail(patientId, boardId) }),
      ),
  })

  return { create, rename, setPrimary, remove }
}
