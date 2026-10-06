import { useQuery } from '@tanstack/react-query'
import type { CartillaDetalleResponse, CartillaResponse } from './apiTypes'
import { fetchBoardDetail, fetchBoards } from './boardsApi'
import { toBoard, toBoardSummaries } from './mappers'
import type { Board, BoardSummary } from './types'

export const boardKeys = {
  all: ['boards'] as const,
  list: (patientId: string) => ['boards', 'patient', patientId, 'list'] as const,
  detail: (patientId: string, boardId: string) =>
    ['boards', 'patient', patientId, 'detail', boardId] as const,
}

const STALE_TIME = 30_000

export function useBoards(patientId: string) {
  return useQuery<CartillaResponse[], Error, BoardSummary[]>({
    queryKey: boardKeys.list(patientId),
    queryFn: () => fetchBoards(patientId),
    select: toBoardSummaries,
    staleTime: STALE_TIME,
  })
}

export function useBoardDetail(patientId: string, boardId: string) {
  return useQuery<CartillaDetalleResponse, Error, Board>({
    queryKey: boardKeys.detail(patientId, boardId),
    queryFn: () => fetchBoardDetail(patientId, boardId),
    select: toBoard,
    staleTime: STALE_TIME,
    // Snapshot semantics: the editor keeps a local draft over a server baseline, so a background
    // refetch must not replace it mid-edit. The editor refreshes this query explicitly after saving.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}
