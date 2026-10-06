import type { QueryClient } from '@tanstack/react-query'
import type { CartillaResponse } from './apiTypes'
import { fetchBoards } from './boardsApi'
import { boardKeys } from './hooks'

export type CartillaOperation = 'create' | 'rename' | 'primary' | 'delete'

/**
 * `request`: the POST/PUT/DELETE failed;
 * `reload`: the write succeeded but the cartilla list could not be reloaded.
 */
export type CartillaOperationStage = 'request' | 'reload'

/** Thrown by the cartilla list operations. */
export class CartillaOperationError extends Error {
  operation: CartillaOperation
  stage: CartillaOperationStage
  cause: unknown

  constructor(operation: CartillaOperation, stage: CartillaOperationStage, cause: unknown) {
    super(`Cartilla ${operation} failed at stage "${stage}"`)
    this.name = 'CartillaOperationError'
    this.operation = operation
    this.stage = stage
    this.cause = cause
  }
}

/** Refetches the patient's cartilla list (bypassing staleness); this updates the cache the list renders from. */
export function reloadBoardList(queryClient: QueryClient, patientId: string): Promise<CartillaResponse[]> {
  return queryClient.fetchQuery({
    queryKey: boardKeys.list(patientId),
    queryFn: () => fetchBoards(patientId),
    staleTime: 0,
  })
}
