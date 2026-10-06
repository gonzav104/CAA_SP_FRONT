import type { QueryClient } from '@tanstack/react-query'
import { fetchBoardDetail } from './boardsApi'
import { boardKeys } from './hooks'
import { toBoard } from './mappers'
import type { Board } from './types'

/**
 * `pictogram`: registering the chosen ARASAAC pictogram failed (nothing was created);
 * `request`: the POST/PUT/DELETE failed (for a category move: at least one of the PUTs failed);
 * `reload`: the write succeeded but the board could not be reloaded.
 */
export type BoardOperationStage = 'pictogram' | 'request' | 'reload'

/** Thrown by the immediate item and category operations. `fresh` is what the server holds now, or null when unknown. */
export class BoardOperationError extends Error {
  stage: BoardOperationStage
  cause: unknown
  fresh: Board | null
  /** Id of the item that WAS created (only for a `reload` failure of a create). */
  createdId: string | null

  constructor(stage: BoardOperationStage, cause: unknown, fresh: Board | null = null, createdId: string | null = null) {
    super(`Board operation failed at stage "${stage}"`)
    this.name = 'BoardOperationError'
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
