import { useQuery } from '@tanstack/react-query'
import type { PictogramaGlobalResponse } from './apiTypes'
import { toGlobalPictograms } from './mappers'
import { fetchGlobalPictograms } from './pictogramsApi'
import type { Pictogram } from './types'

export const pictogramKeys = {
  all: ['pictograms'] as const,
  global: () => ['pictograms', 'global'] as const,
}

const STALE_TIME = 5 * 60_000

/** The global pictogram library: raw DTOs are cached, the sorted domain list is derived. */
export function useGlobalPictograms() {
  return useQuery<PictogramaGlobalResponse[], Error, Pictogram[]>({
    queryKey: pictogramKeys.global(),
    queryFn: fetchGlobalPictograms,
    select: toGlobalPictograms,
    staleTime: STALE_TIME,
    refetchOnWindowFocus: false,
  })
}
