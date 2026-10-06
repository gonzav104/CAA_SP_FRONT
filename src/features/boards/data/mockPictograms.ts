import type { Pictogram } from '../types'

// Local ARASAAC copies (see public/pictograms/arasaac): only a COMPLEMENT for pictograms the
// backend does not have yet. The picker is fed by `GET /api/pictogramas-globales`; an entry here
// is offered only when no real pictogram covers its ARASAAC id. When chosen, it is registered
// through `POST /materializar` when saving.
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
