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
