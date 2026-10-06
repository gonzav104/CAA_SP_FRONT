import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { setUnauthorizedHandler } from '@/api/client'
import { authKeys } from '@/features/auth/hooks'
import { queryClient } from './queryClient'

export function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => {
    // An expired session on any non-auth request marks the user as signed out.
    setUnauthorizedHandler(() => queryClient.setQueryData(authKeys.me, null))
    return () => setUnauthorizedHandler(null)
  }, [])

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
