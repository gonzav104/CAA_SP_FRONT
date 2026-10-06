import type { Pictogram } from '../types'

// TEMPORARY picker library: there is no pictogram-list endpoint yet, so the editor offers
// these local ARASAAC copies (see public/pictograms/arasaac). Replace when the backend exposes one.
const arasaac = (arasaacId: number, label: string): Pictogram => ({
  id: `arasaac-${arasaacId}`,
  label,
  imageUrl: `/pictograms/arasaac/${arasaacId}.png`,
  kind: 'LOCAL_MOCK',
})

export const mockPictograms: Pictogram[] = [
  arasaac(27559, 'baño'),
  arasaac(7272, 'hambre'),
  arasaac(7273, 'sed'),
  arasaac(6156, 'no quiero'),
  arasaac(35539, 'me molesta'),
  arasaac(32648, 'ayuda'),
  arasaac(5584, 'sí'),
  arasaac(5526, 'no'),
  arasaac(32464, 'agua'),
  arasaac(6456, 'comer'),
  arasaac(23392, 'jugar'),
  arasaac(6479, 'dormir'),
]
