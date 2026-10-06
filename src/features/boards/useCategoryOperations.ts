import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BoardOperationError, reloadBoard } from './boardOperations'
import { createCategory, deleteCategory, updateCategory } from './categoriesApi'
import { DEFAULT_CATEGORY_COLOR, planCategoryMove } from './categoryPlan'
import type { Board, BoardCategory } from './types'

export interface RenameCategoryInput {
  category: BoardCategory
  name: string
}

export interface MoveCategoryInput {
  /** Current categories in display order. */
  categories: BoardCategory[]
  categoryId: string
  direction: -1 | 1
}

/**
 * The immediate category operations. Each one ends with a board reload (the returned `fresh` Board) so
 * the cache and the editor match the server. No automatic retries; every failure is a `BoardOperationError`:
 * `request` = the write(s) failed, `reload` = the write(s) succeeded but the reload failed.
 *
 * - create: POST without `orden` (the backend appends) and with the DB default color.
 * - rename: PUT with the new name and the category's current color (both are always replaced).
 * - move: the planned `orden` PUTs in parallel; the board is reloaded even when some failed, and the
 *   error then carries that `fresh` server truth.
 * - remove: DELETE. The backend also deletes every item of the category.
 */
export function useCategoryOperations(patientId: string, boardId: string) {
  const queryClient = useQueryClient()
  const target = { patientId, boardId }

  const reload = async (): Promise<Board> => {
    try {
      return await reloadBoard(queryClient, patientId, boardId)
    } catch (error) {
      throw new BoardOperationError('reload', error)
    }
  }

  const create = useMutation<Board, BoardOperationError, string>({
    mutationFn: async (name) => {
      try {
        await createCategory(target, { nombre: name.trim(), colorHex: DEFAULT_CATEGORY_COLOR })
      } catch (error) {
        throw new BoardOperationError('request', error)
      }
      return reload()
    },
  })

  const rename = useMutation<Board, BoardOperationError, RenameCategoryInput>({
    mutationFn: async ({ category, name }) => {
      try {
        await updateCategory({ ...target, categoryId: category.id }, { nombre: name.trim(), colorHex: category.colorHex })
      } catch (error) {
        throw new BoardOperationError('request', error)
      }
      return reload()
    },
  })

  const move = useMutation<Board, BoardOperationError, MoveCategoryInput>({
    mutationFn: async ({ categories, categoryId, direction }) => {
      const changes = planCategoryMove(categories, categoryId, direction)
      const results = await Promise.allSettled(
        changes.map(({ categoryId: changedId, orden }) => {
          const category = categories.find((candidate) => candidate.id === changedId)
          if (!category) return Promise.reject(new Error(`Unknown category ${changedId}`))
          return updateCategory(
            { ...target, categoryId: changedId },
            { nombre: category.name, colorHex: category.colorHex, orden },
          )
        }),
      )
      const failure = results.find((result): result is PromiseRejectedResult => result.status === 'rejected')

      let fresh: Board | null = null
      let reloadError: unknown = null
      try {
        fresh = await reloadBoard(queryClient, patientId, boardId)
      } catch (error) {
        reloadError = error
      }

      if (failure) throw new BoardOperationError('request', failure.reason, fresh)
      if (!fresh) throw new BoardOperationError('reload', reloadError)
      return fresh
    },
  })

  const remove = useMutation<Board, BoardOperationError, BoardCategory>({
    mutationFn: async (category) => {
      try {
        await deleteCategory({ ...target, categoryId: category.id })
      } catch (error) {
        throw new BoardOperationError('request', error)
      }
      return reload()
    },
  })

  return { create, rename, move, remove }
}
