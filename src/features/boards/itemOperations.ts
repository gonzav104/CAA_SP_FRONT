import type { QueryClient } from '@tanstack/react-query'
import { fetchBoardDetail } from './boardsApi'
import { boardKeys } from './hooks'
import { toBoard } from './mappers'
import type { Board } from './types'

/**
 * `pictogram`: registering the chosen ARASAAC pictogram failed (nothing was created);
 * `request`: the POST/DELETE failed (nothing changed on the server);
 * `reload`: the write succeeded but the board could not be reloaded.
 */
export type ItemOperationStage = 'pictogram' | 'request' | 'reload'

/** Thrown by the create and delete hooks. `fresh` is what the server holds now, or null when unknown. */
export class ItemOperationError extends Error {
  stage: ItemOperationStage
  cause: unknown
  fresh: Board | null
  /** Id of the item that WAS created (only for a `reload` failure of a create). */
  createdId: string | null

  constructor(stage: ItemOperationStage, cause: unknown, fresh: Board | null = null, createdId: string | null = null) {
    super(`Item operation failed at stage "${stage}"`)
    this.name = 'ItemOperationError'
    this.stage = stage
    this.cause = cause
    this.fresh = fresh
    this.createdId = createdId
  }
}

/** Refetches the board detail (bypassing staleness) so the query cache, and therefore Use Mode, matches the server. */
export async function reloadBoard(queryClient: QueryClient, patientId: string, boardId: string): Promise<Board> {
  const detail = await queryClient.fetchQuery({
    queryKey: boardKeys.detail(patientId, boardId),
    queryFn: () => fetchBoardDetail(patientId, boardId),
    staleTime: 0,
  })
  return toBoard(detail)
}
