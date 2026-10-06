import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createBoardItem } from './boardItemsApi'
import { BoardOperationError, reloadBoard } from './boardOperations'
import { pictogramKeys } from './pictogramHooks'
import { materializePictogram } from './pictogramsApi'
import { arasaacIdOf } from './pictograms'
import type { Board, Pictogram } from './types'

/** Backend `MaterializarPictogramaDTO.etiqueta` column limit. */
const ETIQUETA_MAX = 100

export interface CreateItemInput {
  categoryId: string
  pictogram: Pictogram
  label: string
  spokenText: string
  isActive: boolean
}

export interface CreateItemResult {
  fresh: Board
  createdId: string
}

/**
 * Creates one item at the end of a category. A local ARASAAC pictogram is registered first (once,
 * the only moment it happens besides saving), then the item is POSTed WITHOUT `ordenVisual` (the
 * backend appends it), and the board detail is always reloaded so the cache matches the server.
 * No automatic retries: every failure is a `BoardOperationError` with its stage.
 */
export function useCreateBoardItem(patientId: string, boardId: string) {
  const queryClient = useQueryClient()

  return useMutation<CreateItemResult, BoardOperationError, CreateItemInput>({
    mutationFn: async ({ categoryId, pictogram, label, spokenText, isActive }) => {
      let recursoGlobalId: string | null = null
      let recursoCustomId: string | null = null

      if (pictogram.kind === 'LOCAL_MOCK') {
        const arasaacId = arasaacIdOf(pictogram)
        if (arasaacId === null) throw new BoardOperationError('pictogram', new Error('Pictogram without ARASAAC id'))
        try {
          const materialized = await materializePictogram({
            arasaacId,
            etiqueta: pictogram.label.trim().slice(0, ETIQUETA_MAX),
          })
          recursoGlobalId = materialized.id
        } catch (error) {
          throw new BoardOperationError('pictogram', error)
        }
        // The new global row exists now: refresh the library. It must never fail the operation.
        void queryClient.invalidateQueries({ queryKey: pictogramKeys.global() })
      } else if (pictogram.kind === 'GLOBAL') {
        recursoGlobalId = pictogram.id
      } else {
        recursoCustomId = pictogram.id
      }

      let createdId: string
      try {
        const created = await createBoardItem(
          { patientId, boardId, categoryId },
          {
            textoVisible: label.trim(),
            textoHablado: spokenText.trim(),
            recursoGlobalId,
            recursoCustomId,
            esCore: false,
            visibleEnModoUso: isActive,
          },
        )
        createdId = created.id
      } catch (error) {
        throw new BoardOperationError('request', error)
      }

      try {
        return { fresh: await reloadBoard(queryClient, patientId, boardId), createdId }
      } catch (error) {
        throw new BoardOperationError('reload', error, null, createdId)
      }
    },
  })
}
