import type { ItemCartillaActualizacionRequest } from './apiTypes'
import { arasaacIdOf } from './pictograms'
import type { Board, BoardItem, Pictogram } from './types'

/** Backend `ItemCartillaActualizacionDTO.textoVisible` limit. */
export const TEXTO_VISIBLE_MAX = 30
/** Backend `ItemCartillaActualizacionDTO.textoHablado` limit. */
export const TEXTO_HABLADO_MAX = 255

export type SaveBlockerReason =
  | 'blank-label'
  | 'label-too-long'
  | 'blank-spoken-text'
  | 'spoken-text-too-long'
  | 'local-pictogram'
  | 'missing-pictogram'
  | 'missing-category'
  | 'added-item'
  | 'removed-item'

export interface SaveBlocker {
  itemId: string
  itemLabel: string
  reason: SaveBlockerReason
}

/** Backend `MaterializarPictogramaDTO.etiqueta` column limit. */
const ETIQUETA_MAX = 100

/** A local ARASAAC library pictogram that must be registered in the backend while saving. */
export interface PendingPictogram {
  arasaacId: number
  label: string
}

export interface ItemUpdate {
  itemId: string
  categoryId: string
  /** For a `pendingPictogram`, both resource ids are null until the save materializes it. */
  request: ItemCartillaActualizacionRequest
  pendingPictogram: PendingPictogram | null
}

export interface SavePlan {
  updates: ItemUpdate[]
  blockers: SaveBlocker[]
}

const UNNAMED_ITEM = 'Tarjeta sin texto'

function isSamePictogram(a: Pictogram | null, b: Pictogram | null): boolean {
  if (a === null || b === null) return a === b
  return a.id === b.id && a.kind === b.kind
}

function byVisualOrder(a: BoardItem, b: BoardItem): number {
  return a.visualOrder - b.visualOrder
}

function groupByCategory(items: BoardItem[]): Map<string | null, BoardItem[]> {
  const groups = new Map<string | null, BoardItem[]>()
  for (const item of items) {
    const group = groups.get(item.categoryId)
    if (group) group.push(item)
    else groups.set(item.categoryId, [item])
  }
  return groups
}

/**
 * New server order per item. Each category reuses the sorted multiset of its existing server
 * orders and hands the values out following the draft order, so gaps survive and as few values
 * as possible change. A category whose item count differs (structural change) keeps its orders.
 */
function computeNewOrders(baseline: Board, draft: Board): Map<string, number | null> {
  const result = new Map<string, number | null>()
  const baselineById = new Map(baseline.items.map((item) => [item.id, item]))
  const draftGroups = groupByCategory(
    draft.items.filter((item) => baselineById.has(item.id)).sort(byVisualOrder),
  )

  for (const [categoryId, baselineItems] of groupByCategory([...baseline.items].sort(byVisualOrder))) {
    const draftItems = draftGroups.get(categoryId) ?? []
    const values = baselineItems.flatMap((item) => (item.serverOrder === null ? [] : [item.serverOrder]))
    const canAssign = draftItems.length === baselineItems.length && values.length === baselineItems.length
    values.sort((a, b) => a - b)
    draftItems.forEach((item, index) => {
      result.set(item.id, canAssign ? values[index] : (baselineById.get(item.id)?.serverOrder ?? null))
    })
  }
  return result
}

function collectBlockers(item: BoardItem, itemLabel: string): SaveBlocker[] {
  const reasons: SaveBlockerReason[] = []
  const label = item.label.trim()
  const spokenText = item.spokenText.trim()
  if (label === '') reasons.push('blank-label')
  else if (label.length > TEXTO_VISIBLE_MAX) reasons.push('label-too-long')
  if (spokenText === '') reasons.push('blank-spoken-text')
  else if (spokenText.length > TEXTO_HABLADO_MAX) reasons.push('spoken-text-too-long')
  if (item.pictogram === null) reasons.push('missing-pictogram')
  else if (item.pictogram.kind === 'LOCAL_MOCK' && arasaacIdOf(item.pictogram) === null) reasons.push('local-pictogram')
  if (item.categoryId === null) reasons.push('missing-category')
  return reasons.map((reason) => ({ itemId: item.id, itemLabel, reason }))
}

/**
 * Pure diff between the server snapshot and the editor draft: the PUTs to send (only items
 * that really changed, with the full DTO) and what prevents saving. Never mutates its inputs.
 */
export function planBoardSave(baseline: Board, draft: Board): SavePlan {
  const updates: ItemUpdate[] = []
  const blockers: SaveBlocker[] = []
  const baselineById = new Map(baseline.items.map((item) => [item.id, item]))
  const draftIds = new Set(draft.items.map((item) => item.id))
  const newOrders = computeNewOrders(baseline, draft)

  for (const item of [...draft.items].sort(byVisualOrder)) {
    const base = baselineById.get(item.id)
    if (!base) {
      blockers.push({ itemId: item.id, itemLabel: item.label.trim() || UNNAMED_ITEM, reason: 'added-item' })
      continue
    }

    const newOrder = newOrders.get(item.id) ?? base.serverOrder
    const isChanged =
      item.label.trim() !== base.label.trim() ||
      item.spokenText.trim() !== base.spokenText.trim() ||
      item.isActive !== base.isActive ||
      !isSamePictogram(item.pictogram, base.pictogram) ||
      newOrder !== base.serverOrder
    if (!isChanged) continue

    const itemLabel = item.label.trim() || base.label.trim() || UNNAMED_ITEM
    const itemBlockers = collectBlockers(item, itemLabel)
    if (itemBlockers.length > 0 || item.categoryId === null || item.pictogram === null) {
      blockers.push(...itemBlockers)
      continue
    }

    const arasaacId = item.pictogram.kind === 'LOCAL_MOCK' ? arasaacIdOf(item.pictogram) : null
    updates.push({
      itemId: item.id,
      categoryId: item.categoryId,
      request: {
        textoVisible: item.label.trim(),
        textoHablado: item.spokenText.trim(),
        ordenVisual: newOrder,
        recursoGlobalId: item.pictogram.kind === 'GLOBAL' ? item.pictogram.id : null,
        recursoCustomId: item.pictogram.kind === 'CUSTOM' ? item.pictogram.id : null,
        esCore: item.isCore,
        visibleEnModoUso: item.isActive,
      },
      pendingPictogram:
        arasaacId === null ? null : { arasaacId, label: item.pictogram.label.trim().slice(0, ETIQUETA_MAX) },
    })
  }

  for (const base of [...baseline.items].sort(byVisualOrder)) {
    if (!draftIds.has(base.id)) {
      blockers.push({ itemId: base.id, itemLabel: base.label.trim() || UNNAMED_ITEM, reason: 'removed-item' })
    }
  }

  return { updates, blockers }
}

export function describeBlocker(blocker: SaveBlocker): string {
  const { itemLabel } = blocker
  switch (blocker.reason) {
    case 'blank-label':
      return `${itemLabel}: el texto visible es obligatorio.`
    case 'label-too-long':
      return `${itemLabel}: el texto visible admite hasta ${TEXTO_VISIBLE_MAX} caracteres.`
    case 'blank-spoken-text':
      return `${itemLabel}: el texto hablado es obligatorio.`
    case 'spoken-text-too-long':
      return `${itemLabel}: el texto hablado admite hasta ${TEXTO_HABLADO_MAX} caracteres.`
    case 'local-pictogram':
      return `${itemLabel}: el pictograma elegido no se puede vincular con ARASAAC.`
    case 'missing-pictogram':
      return `${itemLabel}: no tiene pictograma.`
    case 'missing-category':
      return `${itemLabel}: no tiene categoría.`
    case 'added-item':
      return 'Agregar tarjetas todavía no se puede guardar.'
    case 'removed-item':
      return 'Eliminar tarjetas todavía no se puede guardar.'
  }
}
