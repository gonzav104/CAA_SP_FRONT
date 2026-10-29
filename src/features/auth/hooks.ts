import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchCurrentUser, login, logout, register, requestPasswordReset, resetPassword } from './authApi'
import { SessionNotEstablishedError } from './errors'
import type { CurrentUser, LoginRequest, RegistroRequest, RestablecerPasswordRequest } from './types'

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

// None of these touch the session nor any cached data: the user still has to log in afterwards.
export function useRegister() {
  return useMutation<CurrentUser, Error, RegistroRequest>({ mutationFn: (request) => register(request) })
}

export function useRequestPasswordReset() {
  return useMutation<void, Error, string>({ mutationFn: (email) => requestPasswordReset(email) })
}

export function useResetPassword() {
  return useMutation<void, Error, RestablecerPasswordRequest>({ mutationFn: (request) => resetPassword(request) })
}
