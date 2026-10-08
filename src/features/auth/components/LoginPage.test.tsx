import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchCurrentUser, login } from '../authApi'
import type { CurrentUser } from '../types'
import { LoginPage } from './LoginPage'

vi.mock('../authApi')

const user: CurrentUser = {
  id: '3f0c8a52-6a53-4b86-9f7e-0b5b3c3f2f10',
  email: 'ana@example.com',
  nombre: 'Ana',
  rol: 'TERAPEUTA',
  creadoEn: '2026-01-01T10:00:00',
}

function http401(): AxiosError {
  const config = { headers: {} } as InternalAxiosRequestConfig
  return new AxiosError('failed', 'ERR_BAD_REQUEST', config, null, {
    status: 401,
    statusText: '',
    headers: {},
    config,
    data: {},
  })
}

function renderLogin() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<p>Dashboard stub</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function fillAndSubmit() {
  await userEvent.type(await screen.findByLabelText('Email'), 'ana@example.com')
  await userEvent.type(screen.getByLabelText('Contraseña'), 'secret')
  await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }))
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.mocked(login).mockReset()
    vi.mocked(fetchCurrentUser).mockReset()
    vi.mocked(fetchCurrentUser).mockResolvedValue(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows validation errors on empty submit and does not call login', async () => {
    renderLogin()
    await userEvent.click(await screen.findByRole('button', { name: 'Ingresar' }))
    expect(await screen.findByText('Ingresa un email válido')).toBeInTheDocument()
    expect(screen.getByText('Ingresa tu contraseña')).toBeInTheDocument()
    expect(login).not.toHaveBeenCalled()
  })

  it('shows the 401 copy in an alert for wrong credentials', async () => {
    vi.mocked(login).mockRejectedValue(http401())
    renderLogin()
    await fillAndSubmit()
    expect(await screen.findByRole('alert')).toHaveTextContent('Email o contraseña incorrectos.')
  })

  it('navigates to the dashboard on success', async () => {
    vi.mocked(login).mockResolvedValue({ token: null, tipo: 'Bearer' })
    vi.mocked(fetchCurrentUser).mockResolvedValueOnce(null).mockResolvedValue(user)
    renderLogin()
    await fillAndSubmit()
    expect(await screen.findByText('Dashboard stub')).toBeInTheDocument()
    expect(login).toHaveBeenCalledWith({ email: 'ana@example.com', password: 'secret' })
  })

  it('shows the cookies message when login succeeds but /me is still null', async () => {
    vi.mocked(login).mockResolvedValue({ token: null, tipo: 'Bearer' })
    renderLogin()
    await fillAndSubmit()
    expect(await screen.findByRole('alert')).toHaveTextContent('Verifica que el navegador permita cookies.')
  })

  it('disables the submit button while pending', async () => {
    vi.mocked(login).mockReturnValue(new Promise(() => {}))
    renderLogin()
    await fillAndSubmit()
    const button = await screen.findByRole('button', { name: 'Ingresando…' })
    expect(button).toBeDisabled()
  })

  it('redirects an already authenticated visitor to the dashboard', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(user)
    renderLogin()
    expect(await screen.findByText('Dashboard stub')).toBeInTheDocument()
  })

  it('does not write anything to Web Storage during login', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    vi.mocked(login).mockResolvedValue({ token: null, tipo: 'Bearer' })
    vi.mocked(fetchCurrentUser).mockResolvedValueOnce(null).mockResolvedValue(user)
    renderLogin()
    await fillAndSubmit()
    await waitFor(() => expect(screen.getByText('Dashboard stub')).toBeInTheDocument())
    expect(setItem).not.toHaveBeenCalled()
  })
})
