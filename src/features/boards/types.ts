/**
 * Board domain used by the editor and Use Mode. The UI board is flat: the categories of the
 * backend cartilla are flattened into one ordered list of items (see `toBoard`).
 */

export interface Pictogram {
  id: string
  /** Backend: `etiqueta`. */
  label: string
  /** Backend: `imagenUrl`. */
  imageUrl: string
  /** `LOCAL_MOCK` marks the temporary local picker library (not a backend pictogram). */
  kind: 'GLOBAL' | 'CUSTOM' | 'LOCAL_MOCK'
}

export interface BoardItem {
  id: string
  /** Category the item came from; null for locally added items without a category. */
  categoryId: string | null
  pictogram: Pictogram | null
  /** Backend: `textoVisible`. Text shown on the card. */
  label: string
  /** Backend: `textoHablado`. Text read aloud. */
  spokenText: string
  /** Backend: `ordenVisual`, normalized to a contiguous 1..n sequence across the flattened board. */
  visualOrder: number
  /** Backend: `visibleEnModoUso`. */
  isActive: boolean
  /** Backend: `esCore`. */
  isCore: boolean
}

export interface Board {
  id: string
  /** Backend: `nombre`. */
  name: string
  /** Backend: `esPrincipal`. */
  isPrimary: boolean
  /** Backend: `creadorId`. */
  creatorId: string
  items: BoardItem[]
}

export interface BoardSummary {
  id: string
  name: string
  isPrimary: boolean
  creatorId: string
  /** ISO local datetime. */
  createdAt: string
}
