import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { logout } from '../authApi'
import { authKeys } from '../hooks'
import type { CurrentUser } from '../types'
import { LogoutButton } from './LogoutButton'

vi.mock('../authApi')

const user: CurrentUser = {
  id: '3f0c8a52-6a53-4b86-9f7e-0b5b3c3f2f10',
  email: 'ana@example.com',
  nombre: 'Ana',
  rol: 'TERAPEUTA',
  creadoEn: '2026-01-01T10:00:00',
}

function renderButton() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  queryClient.setQueryData(authKeys.me, user)
  queryClient.setQueryData(['patients'], [{ id: 1 }])
  render(
    <QueryClientProvider client={queryClient}>
      <LogoutButton />
    </QueryClientProvider>,
  )
  return queryClient
}

describe('LogoutButton', () => {
  beforeEach(() => {
    vi.mocked(logout).mockReset()
  })

  it('logs out, nulls the session and removes non-auth queries', async () => {
    vi.mocked(logout).mockResolvedValue(undefined)
    const queryClient = renderButton()

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    await vi.waitFor(() => expect(queryClient.getQueryData(authKeys.me)).toBeNull())
    expect(logout).toHaveBeenCalledTimes(1)
    expect(queryClient.getQueryData(['patients'])).toBeUndefined()
  })

  it('shows an alert when logout fails and keeps the session', async () => {
    vi.mocked(logout).mockRejectedValue(new Error('boom'))
    const queryClient = renderButton()

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cerrar la sesión. Intenta nuevamente.')
    expect(queryClient.getQueryData(authKeys.me)).toEqual(user)
  })
})
