export type ParadigmaCartilla = 'taxonomica' | 'esquematica'
export type TipoPictograma = 'GLOBAL' | 'CUSTOM'

// Mirrors CartillaResponseDTO.
export interface CartillaResponse {
  id: string
  pacienteId: string
  creadorId: string
  nombre: string
  esPrincipal: boolean
  /** ISO local datetime. */
  creadoEn: string
}

// Mirrors the nested pictogram of ItemDetalleResponseDTO.
export interface PictogramaInfo {
  id: string
  etiqueta: string
  imagenUrl: string
  tipo: TipoPictograma
}

// Mirrors ItemDetalleResponseDTO. Hidden items (`visibleEnModoUso: false`) are included.
export interface ItemDetalleResponse {
  id: string
  textoHablado: string
  /** 0-based and per category; gaps and duplicates are possible. */
  ordenVisual: number
  pictograma: PictogramaInfo | null
  esCore: boolean
  textoVisible: string
  visibleEnModoUso: boolean
}

// Mirrors ItemCartillaActualizacionDTO. `textoHablado` and the resource (exactly one of
// `recursoGlobalId` / `recursoCustomId`) are always replaced; null on the other fields keeps the current value.
export interface ItemCartillaActualizacionRequest {
  /** Required, not blank, max 255. */
  textoHablado: string
  ordenVisual?: number | null
  recursoGlobalId?: string | null
  recursoCustomId?: string | null
  esCore?: boolean | null
  /** Max 30, not blank when present (the backend trims it). */
  textoVisible?: string | null
  visibleEnModoUso?: boolean | null
}

// Mirrors ItemCartillaResponseDTO.
export interface ItemCartillaResponse {
  id: string
  categoriaId: string
  textoHablado: string
  ordenVisual: number
  recursoGlobalId: string | null
  recursoCustomId: string | null
  creadoEn: string
  esCore: boolean
  textoVisible: string | null
  visibleEnModoUso: boolean
}

// Mirrors CategoriaDetalleResponseDTO.
export interface CategoriaDetalleResponse {
  id: string
  nombre: string
  colorHex: string
  orden: number
  items: ItemDetalleResponse[]
}

// Mirrors CartillaDetalleResponseDTO: the single aggregated source for the editor and Use Mode.
export interface CartillaDetalleResponse {
  id: string
  creadorId: string
  nombre: string
  esPrincipal: boolean
  paradigma: ParadigmaCartilla
  categorias: CategoriaDetalleResponse[]
}

// Mirrors MaterializarPictogramaDTO.
export interface MaterializarPictogramaRequest {
  /** ARASAAC pictogram id, >= 1. */
  arasaacId: number
  /** Required, not blank; the DB column holds at most 100 characters. */
  etiqueta: string
}

// Mirrors PictogramaGlobalResponseDTO. 201 when created, 200 when it already existed (idempotent;
// the existing row keeps its original `etiqueta`).
export interface PictogramaGlobalResponse {
  id: string
  etiqueta: string
  imagenUrl: string
  arasaacId: number | null
  creadoEn: string
}
