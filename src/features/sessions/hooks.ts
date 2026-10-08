import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { SesionResponse, SesionWriteRequest } from './apiTypes'
import { toSession, toSessions } from './mappers'
import { createSession, deleteSession, fetchSessions, updateSession } from './sessionsApi'
import type { Session } from './types'

export const sessionKeys = {
  all: ['sessions'] as const,
  list: (patientId: string) => ['sessions', 'patient', patientId, 'list'] as const,
}

const STALE_TIME = 30_000

export function useSessions(patientId: string) {
  return useQuery<SesionResponse[], Error, Session[]>({
    queryKey: sessionKeys.list(patientId),
    queryFn: () => fetchSessions(patientId),
    select: toSessions,
    staleTime: STALE_TIME,
  })
}

export function useCreateSession(patientId: string) {
  const queryClient = useQueryClient()
  return useMutation<Session, Error, SesionWriteRequest>({
    mutationFn: async (request) => toSession(await createSession(patientId, request)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sessionKeys.list(patientId) })
    },
  })
}

export function useUpdateSession(patientId: string) {
  const queryClient = useQueryClient()
  return useMutation<Session, Error, { sessionId: string; request: SesionWriteRequest }>({
    mutationFn: async ({ sessionId, request }) => toSession(await updateSession(patientId, sessionId, request)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sessionKeys.list(patientId) })
    },
  })
}

export function useDeleteSession(patientId: string) {
  const queryClient = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (sessionId) => deleteSession(patientId, sessionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sessionKeys.list(patientId) })
    },
  })
}
