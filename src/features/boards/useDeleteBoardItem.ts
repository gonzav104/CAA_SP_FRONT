import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteBoardItem } from './boardItemsApi'
import { ItemOperationError, reloadBoard } from './itemOperations'
import type { Board } from './types'

export interface DeleteItemInput {
  categoryId: string
  itemId: string
}

/**
 * Deletes one item, then always reloads the board detail so the cache matches the server.
 * `request`: the DELETE failed (the card is still there); `reload`: it succeeded but the reload failed.
 */
export function useDeleteBoardItem(patientId: string, boardId: string) {
  const queryClient = useQueryClient()

  return useMutation<Board, ItemOperationError, DeleteItemInput>({
    mutationFn: async ({ categoryId, itemId }) => {
      try {
        await deleteBoardItem({ patientId, boardId, categoryId, itemId })
      } catch (error) {
        throw new ItemOperationError('request', error)
      }

      try {
        return await reloadBoard(queryClient, patientId, boardId)
      } catch (error) {
        throw new ItemOperationError('reload', error)
      }
    },
  })
}
