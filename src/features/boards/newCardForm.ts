import { TEXTO_HABLADO_MAX, TEXTO_VISIBLE_MAX } from './savePlan'
import type { BoardCategory, Pictogram } from './types'

/** Transient state of the "new card" form; it exists only while the form is open. */
export interface NewCardForm {
  categoryId: string
  pictogram: Pictogram | null
  label: string
  spokenText: string
  isActive: boolean
}

export function createEmptyNewCard(categoryId: string): NewCardForm {
  return { categoryId, pictogram: null, label: '', spokenText: '', isActive: true }
}

/** The form holds something the user typed or chose (the category and the switch alone do not count). */
export function isNewCardDirty(form: NewCardForm | null): boolean {
  return form !== null && (form.label.trim() !== '' || form.spokenText.trim() !== '' || form.pictogram !== null)
}

export function isNewCardValid(form: NewCardForm, categories: BoardCategory[]): boolean {
  const label = form.label.trim()
  const spokenText = form.spokenText.trim()
  return (
    form.pictogram !== null &&
    label.length >= 1 &&
    label.length <= TEXTO_VISIBLE_MAX &&
    spokenText.length >= 1 &&
    spokenText.length <= TEXTO_HABLADO_MAX &&
    categories.some((category) => category.id === form.categoryId)
  )
}

function capitalize(text: string): string {
  const trimmed = text.trim()
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

/**
 * Chooses a pictogram. The first choice on a pristine form (no pictogram, both texts empty) also
 * prefills the visible and spoken texts with the capitalized pictogram label; both stay editable.
 */
export function withPictogram(form: NewCardForm, pictogram: Pictogram): NewCardForm {
  const isPristine = form.pictogram === null && form.label.trim() === '' && form.spokenText.trim() === ''
  if (!isPristine) return { ...form, pictogram }
  const text = capitalize(pictogram.label)
  return {
    ...form,
    pictogram,
    label: text.slice(0, TEXTO_VISIBLE_MAX),
    spokenText: text.slice(0, TEXTO_HABLADO_MAX),
  }
}
