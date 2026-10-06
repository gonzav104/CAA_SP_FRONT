import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchCurrentUser } from '../authApi'
import type { CurrentUser } from '../types'
import { ProtectedRoute } from './ProtectedRoute'

vi.mock('../authApi')

const user: CurrentUser = {
  id: '3f0c8a52-6a53-4b86-9f7e-0b5b3c3f2f10',
  email: 'ana@example.com',
  nombre: 'Ana',
  rol: 'TERAPEUTA',
  creadoEn: '2026-01-01T10:00:00',
}

function renderGuard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/editor']}>
        <Routes>
          <Route path="/login" element={<p>Login stub</p>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/editor" element={<p>Protected content</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.mocked(fetchCurrentUser).mockReset()
  })

  it('shows a loading status first', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(user)
    renderGuard()
    expect(screen.getByRole('status')).toHaveTextContent('Cargando…')
    expect(await screen.findByText('Protected content')).toBeInTheDocument()
  })

  it('redirects to /login when there is no session', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(null)
    renderGuard()
    expect(await screen.findByText('Login stub')).toBeInTheDocument()
  })

  it('renders the protected child for an authenticated user', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(user)
    renderGuard()
    expect(await screen.findByText('Protected content')).toBeInTheDocument()
  })

  it('shows an error with retry on a 500 and does not redirect', async () => {
    vi.mocked(fetchCurrentUser).mockRejectedValue(new Error('500'))
    renderGuard()
    expect(await screen.findByText('No se pudo verificar la sesión.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    expect(screen.queryByText('Login stub')).not.toBeInTheDocument()
  })

  it('refetches when clicking Reintentar', async () => {
    vi.mocked(fetchCurrentUser).mockRejectedValueOnce(new Error('500')).mockResolvedValue(user)
    renderGuard()
    await userEvent.click(await screen.findByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Protected content')).toBeInTheDocument()
    await waitFor(() => expect(fetchCurrentUser).toHaveBeenCalledTimes(2))
  })
})
