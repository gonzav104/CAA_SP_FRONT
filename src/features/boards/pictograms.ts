import type { Pictogram } from './types'

/** ARASAAC id of a pictogram: from the id of a local-library entry, from the CDN image URL of a real one. */
export function arasaacIdOf(pictogram: Pictogram): number | null {
  const match =
    pictogram.kind === 'LOCAL_MOCK'
      ? /^arasaac-(\d+)$/.exec(pictogram.id)
      : /\/pictograms\/(\d+)\//.exec(pictogram.imageUrl)
  return match ? Number(match[1]) : null
}

/**
 * Picker options: the real pictograms already on the board first (deduped by id, board order),
 * then the local library entries that are not duplicates of a real board pictogram.
 */
export function getPickerOptions(boardPictograms: Pictogram[], library: Pictogram[]): Pictogram[] {
  const seen = new Set<string>()
  const real = boardPictograms.filter((pictogram) => {
    if (pictogram.kind === 'LOCAL_MOCK' || seen.has(pictogram.id)) return false
    seen.add(pictogram.id)
    return true
  })
  const coveredArasaacIds = new Set(real.flatMap((pictogram) => arasaacIdOf(pictogram) ?? []))
  const extras = library.filter((pictogram) => {
    const arasaacId = arasaacIdOf(pictogram)
    return arasaacId === null || !coveredArasaacIds.has(arasaacId)
  })
  return [...real, ...extras]
}
