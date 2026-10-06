import type { Pictogram } from './types'

/**
 * ARASAAC id of a pictogram: the explicit one when set (library pictograms), else from the id of a
 * local-library entry or from the CDN image URL of a real one.
 */
export function arasaacIdOf(pictogram: Pictogram): number | null {
  if (typeof pictogram.arasaacId === 'number') return pictogram.arasaacId
  const match =
    pictogram.kind === 'LOCAL_MOCK'
      ? /^arasaac-(\d+)$/.exec(pictogram.id)
      : /\/pictograms\/(\d+)\//.exec(pictogram.imageUrl)
  return match ? Number(match[1]) : null
}

/**
 * Picker options, in this order: (1) the real pictograms already on the board (deduped by id, board
 * order; keeps CUSTOM ones, which are not in the global library); (2) the rest of the global library;
 * (3) the local library entries whose ARASAAC id no real option covers, so the backend data and the
 * local complement never show the same pictogram twice.
 */
export function getPickerOptions(
  boardPictograms: Pictogram[],
  globalLibrary: Pictogram[],
  localLibrary: Pictogram[],
): Pictogram[] {
  const seen = new Set<string>()
  const keepNew = (pictogram: Pictogram) => {
    if (pictogram.kind === 'LOCAL_MOCK' || seen.has(pictogram.id)) return false
    seen.add(pictogram.id)
    return true
  }
  const real = [...boardPictograms.filter(keepNew), ...globalLibrary.filter(keepNew)]
  const coveredArasaacIds = new Set(real.flatMap((pictogram) => arasaacIdOf(pictogram) ?? []))
  const complement = localLibrary.filter((pictogram) => {
    const arasaacId = arasaacIdOf(pictogram)
    return arasaacId === null || !coveredArasaacIds.has(arasaacId)
  })
  return [...real, ...complement]
}
