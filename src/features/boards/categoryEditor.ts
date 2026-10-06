import type { BoardCategory } from './types'

/** The single inline category editor that can be open in the card list: create, rename or delete confirmation. */
export type CategoryEditor =
  | { kind: 'create'; name: string }
  | { kind: 'rename'; categoryId: string; name: string }
  | { kind: 'delete'; categoryId: string }

/** Message of the last failed category operation. `categoryId` null belongs to the create form. */
export interface CategoryEditorError {
  categoryId: string | null
  message: string
}

/** A typed, changed name counts as unsaved work for the navigation guard; an untouched editor does not. */
export function isCategoryEditorDirty(editor: CategoryEditor | null, categories: BoardCategory[]): boolean {
  if (editor === null) return false
  if (editor.kind === 'create') return editor.name.trim() !== ''
  if (editor.kind === 'rename') {
    const category = categories.find((candidate) => candidate.id === editor.categoryId)
    return category !== undefined && editor.name.trim() !== category.name.trim()
  }
  return false
}
