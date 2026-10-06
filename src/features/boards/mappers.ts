import type {
  CartillaDetalleResponse,
  CartillaResponse,
  ItemDetalleResponse,
} from './apiTypes'
import type { Board, BoardItem, BoardSummary, Pictogram } from './types'

/** Principal boards first, then oldest first, then by name. Does not mutate the input. */
export function toBoardSummaries(dtos: CartillaResponse[]): BoardSummary[] {
  return [...dtos]
    .sort(
      (a, b) =>
        Number(b.esPrincipal) - Number(a.esPrincipal) ||
        a.creadoEn.localeCompare(b.creadoEn) ||
        a.nombre.localeCompare(b.nombre, 'es'),
    )
    .map((dto) => ({
      id: dto.id,
      name: dto.nombre,
      isPrimary: dto.esPrincipal,
      creatorId: dto.creadorId,
      createdAt: dto.creadoEn,
    }))
}

function toPictogram(dto: ItemDetalleResponse['pictograma']): Pictogram | null {
  if (!dto) return null
  return { id: dto.id, label: dto.etiqueta, imageUrl: dto.imagenUrl, kind: dto.tipo }
}

/**
 * Flattens categories (by `orden`) and their items (by `ordenVisual`) into one list and
 * renumbers `visualOrder` as 1..n. Hidden items are kept. Sorts are stable, so ties keep
 * the order the server sent. Does not mutate the input.
 */
export function toBoard(dto: CartillaDetalleResponse): Board {
  const categories = [...dto.categorias].sort((a, b) => a.orden - b.orden)
  const items: BoardItem[] = categories
    .flatMap((category) =>
      [...category.items]
        .sort((a, b) => a.ordenVisual - b.ordenVisual)
        .map((item) => ({ category, item })),
    )
    .map(({ category, item }, index) => ({
      id: item.id,
      categoryId: category.id,
      pictogram: toPictogram(item.pictograma),
      label: item.textoVisible,
      spokenText: item.textoHablado,
      visualOrder: index + 1,
      isActive: item.visibleEnModoUso,
      isCore: item.esCore,
    }))

  return {
    id: dto.id,
    name: dto.nombre,
    isPrimary: dto.esPrincipal,
    creatorId: dto.creadorId,
    items,
  }
}
