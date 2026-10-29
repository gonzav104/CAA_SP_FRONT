import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import {
  completeGoogleRecovery,
  completeGoogleRegistration,
  fetchCurrentUser,
  googleLogin,
  login,
  logout,
  register,
  requestGoogleRecovery,
  requestPasswordReset,
  resetPassword,
} from './authApi'
import { SessionNotEstablishedError } from './errors'
import type {
  CurrentUser,
  GoogleRecuperacionCompletarRequest,
  LoginRequest,
  RegistroRequest,
  RestablecerPasswordRequest,
} from './types'

export const authKeys = { me: ['auth', 'me'] as const }

const FIVE_MINUTES = 5 * 60 * 1000

export function useCurrentUser() {
  return useQuery<CurrentUser | null>({
    queryKey: authKeys.me,
    queryFn: fetchCurrentUser,
    staleTime: FIVE_MINUTES,
  })
}

/**
 * After any successful login the backend has set the httpOnly cookie; /me proves the session is real
 * (a blocked cookie would leave it null) and seeds the current user for the rest of the app.
 */
async function establishSession(queryClient: QueryClient): Promise<CurrentUser> {
  const user = await queryClient.fetchQuery({
    queryKey: authKeys.me,
    queryFn: fetchCurrentUser,
    staleTime: 0,
  })
  if (!user) throw new SessionNotEstablishedError()
  return user
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (request: LoginRequest): Promise<CurrentUser> => {
      await login(request)
      return establishSession(queryClient)
    },
  })
}

export type GoogleLoginOutcome =
  | { kind: 'authenticated'; user: CurrentUser }
  /** Verified Google identity without an account: the user must confirm creating it. */
  | { kind: 'registration-required'; email: string | null; nombre: string | null }

export function useGoogleLogin() {
  const queryClient = useQueryClient()
  return useMutation<GoogleLoginOutcome, Error, string>({
    mutationFn: async (idToken) => {
      const response = await googleLogin(idToken)
      if (response.requiereRegistro) {
        return { kind: 'registration-required', email: response.email, nombre: response.nombre }
      }
      return { kind: 'authenticated', user: await establishSession(queryClient) }
    },
  })
}

export function useCompleteGoogleRegistration() {
  const queryClient = useQueryClient()
  return useMutation<CurrentUser, Error, string>({
    mutationFn: async (idToken) => {
      await completeGoogleRegistration(idToken)
      return establishSession(queryClient)
    },
  })
}

export function useRequestGoogleRecovery() {
  return useMutation<void, Error, string>({ mutationFn: (idToken) => requestGoogleRecovery(idToken) })
}

export function useCompleteGoogleRecovery() {
  const queryClient = useQueryClient()
  return useMutation<CurrentUser, Error, GoogleRecuperacionCompletarRequest>({
    mutationFn: async (request) => {
      await completeGoogleRecovery(request)
      return establishSession(queryClient)
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
