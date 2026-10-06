import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateBoardItem } from './boardItemsApi'
import { fetchBoardDetail } from './boardsApi'
import { boardKeys } from './hooks'
import { toBoard } from './mappers'
import { materializePictogram } from './pictogramsApi'
import type { ItemUpdate } from './savePlan'
import type { Board } from './types'

/** `pictogram`: registering the chosen ARASAAC pictogram failed (no PUT sent); `update`: the PUT failed. */
export type ItemSaveFailure = { itemId: string; error: unknown; stage: 'pictogram' | 'update' }

/**
 * Thrown when a save did not fully succeed. `failed` lists the items that were not saved (empty when
 * everything was sent but the board could not be reloaded). `fresh` is what the server holds now,
 * or null when that reload failed too.
 */
export class SaveBoardError extends Error {
  failed: ItemSaveFailure[]
  total: number
  fresh: Board | null

  constructor(failed: ItemSaveFailure[], total: number, fresh: Board | null) {
    super(failed.length > 0 ? `Failed to save ${failed.length} of ${total} items` : 'Saved, but the board could not be reloaded')
    this.name = 'SaveBoardError'
    this.failed = failed
    this.total = total
    this.fresh = fresh
  }
}

/** Distinct ARASAAC ids among the updates; the first label wins. */
function collectPendingPictograms(updates: ItemUpdate[]): Map<number, string> {
  const pending = new Map<number, string>()
  for (const { pendingPictogram } of updates) {
    if (pendingPictogram && !pending.has(pendingPictogram.arasaacId)) {
      pending.set(pendingPictogram.arasaacId, pendingPictogram.label)
    }
  }
  return pending
}

/**
 * Registers each distinct local ARASAAC pictogram once (the only place that does), sends every
 * item PUT in parallel, then always reloads the board detail so the query cache (and therefore
 * Use Mode) shows exactly what the server stored.
 */
export function useSaveBoard(patientId: string, boardId: string) {
  const queryClient = useQueryClient()

  return useMutation<Board, SaveBoardError, ItemUpdate[]>({
    mutationFn: async (updates) => {
      const failed: ItemSaveFailure[] = []

      const pending = [...collectPendingPictograms(updates)]
      const materialized = await Promise.allSettled(
        pending.map(([arasaacId, etiqueta]) => materializePictogram({ arasaacId, etiqueta })),
      )
      const resolved = new Map<number, string>()
      const rejected = new Map<number, unknown>()
      materialized.forEach((result, index) => {
        const arasaacId = pending[index][0]
        if (result.status === 'fulfilled') resolved.set(arasaacId, result.value.id)
        else rejected.set(arasaacId, result.reason as unknown)
      })

      const toSend: ItemUpdate[] = []
      for (const update of updates) {
        const arasaacId = update.pendingPictogram?.arasaacId
        if (arasaacId === undefined) {
          toSend.push(update)
        } else if (resolved.has(arasaacId)) {
          toSend.push({
            ...update,
            request: { ...update.request, recursoGlobalId: resolved.get(arasaacId), recursoCustomId: null },
          })
        } else {
          failed.push({ itemId: update.itemId, error: rejected.get(arasaacId), stage: 'pictogram' })
        }
      }

      const results = await Promise.allSettled(
        toSend.map((update) =>
          updateBoardItem(
            { patientId, boardId, categoryId: update.categoryId, itemId: update.itemId },
            update.request,
          ),
        ),
      )
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          failed.push({ itemId: toSend[index].itemId, error: result.reason as unknown, stage: 'update' })
        }
      })

      let fresh: Board | null = null
      try {
        const detail = await queryClient.fetchQuery({
          queryKey: boardKeys.detail(patientId, boardId),
          queryFn: () => fetchBoardDetail(patientId, boardId),
          staleTime: 0,
        })
        fresh = toBoard(detail)
      } catch {
        // Reload failed: the SaveBoardError below carries fresh = null.
      }

      if (failed.length > 0 || !fresh) throw new SaveBoardError(failed, updates.length, fresh)
      return fresh
    },
  })
}
