import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchCurrentUser, login, logout } from './authApi'
import { SessionNotEstablishedError } from './errors'
import type { CurrentUser, LoginRequest } from './types'

export const authKeys = { me: ['auth', 'me'] as const }

const FIVE_MINUTES = 5 * 60 * 1000

export function useCurrentUser() {
  return useQuery<CurrentUser | null>({
    queryKey: authKeys.me,
    queryFn: fetchCurrentUser,
    staleTime: FIVE_MINUTES,
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (request: LoginRequest): Promise<CurrentUser> => {
      await login(request)
      const user = await queryClient.fetchQuery({
        queryKey: authKeys.me,
        queryFn: fetchCurrentUser,
        staleTime: 0,
      })
      if (!user) throw new SessionNotEstablishedError()
      return user
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'auth' })
      queryClient.setQueryData(authKeys.me, null)
    },
  })
}
