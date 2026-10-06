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
