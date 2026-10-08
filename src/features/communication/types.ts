export interface CommunicationItem {
  id: string
  /** Short text shown on the card (backend: pictogram `etiqueta`). */
  label: string
  /** Text read aloud on tap (backend: `ItemCartilla.textoHablado`). */
  spokenText: string
  /** Pictogram image (backend: pictogram `imagenUrl`). */
  imageUrl: string
  /** Stable position on the board (backend: `ItemCartilla.ordenVisual`). */
  order: number
}

/** One category of Use Mode navigation: its real name, in the therapist's order, with only its visible items. */
export interface CommunicationCategory {
  id: string
  /** Backend: `Categoria.nombre`. */
  name: string
  items: CommunicationItem[]
}
