import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { StrictMode } from 'react'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { routes } from '@/app/paths'
import { fetchCurrentUser, login } from '@/features/auth/authApi'
import { LoginPage } from '@/features/auth/components/LoginPage'
import { authKeys } from '@/features/auth/hooks'
import { organizationKeys } from '@/features/organizations/hooks'
import { patientKeys } from '@/features/patients/hooks'
import { therapist } from '@/features/patients/testing/fixtures'
import { LocationProbe } from '@/test/LocationProbe'
import { acceptInvitation } from '../invitationsApi'
import { AcceptInvitationRoute } from './AcceptInvitationRoute'

vi.mock('@/features/auth/authApi')
vi.mock('../invitationsApi')

const TOKEN = 'tok-secret-123'
const invitationUrl = `/invitaciones/aceptar?token=${TOKEN}`

function httpError(status: number): AxiosError {
  const config = { headers: {} } as InternalAxiosRequestConfig
  return new AxiosError('failed', 'ERR_BAD_REQUEST', config, null, { status, statusText: '', headers: {}, config, data: {} })
}

function setup(initialPath = invitationUrl) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const router = createMemoryRouter(
    [
      {
        element: (
          <>
            <LocationProbe />
            <Outlet />
          </>
        ),
        children: [
          { path: routes.login, element: <LoginPage /> },
          { path: routes.acceptInvitation, element: <AcceptInvitationRoute /> },
          { path: '/', element: <p>Dashboard stub</p> },
          { path: '/pacientes/:pacienteId/cartillas', element: <p>Boards stub</p> },
        ],
      },
    ],
    { initialEntries: [initialPath] },
  )
  render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
  return { queryClient, router }
}

const location = () => screen.getByTestId('location')

describe('AcceptInvitationRoute', () => {
  beforeEach(() => {
    vi.mocked(fetchCurrentUser).mockReset().mockResolvedValue(therapist)
    vi.mocked(login).mockReset()
    vi.mocked(acceptInvitation).mockReset()
  })

  it('takes the token out of the URL and never accepts without an explicit confirmation (StrictMode)', async () => {
    const { router } = setup()
    expect(await screen.findByRole('button', { name: 'Aceptar invitación' })).toBeInTheDocument()
    expect(screen.getByText(/con la cuenta ana@example.com/)).toBeInTheDocument()
    expect(router.state.location.search).toBe('')
    expect(location()).toHaveTextContent('/invitaciones/aceptar')
    expect(acceptInvitation).not.toHaveBeenCalled()
  })

  it('accepts a family invitation once, invalidates organizations and patients, and leads to the patient', async () => {
    vi.mocked(acceptInvitation).mockResolvedValue({ tipo: 'PACIENTE_FAMILIAR', organizacionId: null, pacienteId: 'p-9' })
    const { queryClient, router } = setup()
    queryClient.setQueryData(organizationKeys.all, [])
    queryClient.setQueryData(patientKeys.list(), [])
    const user = userEvent.setup()

    const button = await screen.findByRole('button', { name: 'Aceptar invitación' })
    await user.dblClick(button)

    expect(await screen.findByText('Ya tienes acceso al paciente.')).toBeInTheDocument()
    expect(acceptInvitation).toHaveBeenCalledOnce()
    expect(vi.mocked(acceptInvitation).mock.calls[0][0]).toBe(TOKEN)
    expect(queryClient.getQueryState(organizationKeys.all)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(patientKeys.list())?.isInvalidated).toBe(true)
    // The spent token does not stay in the history entry.
    expect(router.state.location.state).toBeNull()

    await user.click(screen.getByRole('link', { name: 'Ir al paciente' }))
    expect(location()).toHaveTextContent('/pacientes/p-9/cartillas')
  })

  it('accepts an organization invitation and leads to the dashboard', async () => {
    vi.mocked(acceptInvitation).mockResolvedValue({ tipo: 'ORGANIZACION', organizacionId: 'org-7', pacienteId: null })
    setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Aceptar invitación' }))
    expect(await screen.findByText('Ya formas parte de la organización.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Ir al inicio' }))
    expect(location()).toHaveTextContent(/^\/$/)
  })

  it('sends a signed-out user to login and comes back to the invitation with the token after logging in', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValueOnce(null).mockResolvedValue(therapist)
    vi.mocked(login).mockResolvedValue({ token: null, tipo: 'Bearer' })
    vi.mocked(acceptInvitation).mockResolvedValue({ tipo: 'PACIENTE_FAMILIAR', organizacionId: null, pacienteId: 'p-9' })
    const { router } = setup()

    await screen.findByRole('button', { name: 'Ingresar' })
    expect(location()).toHaveTextContent('/login')
    expect(router.state.location.search).toBe('')
    expect(acceptInvitation).not.toHaveBeenCalled()

    await userEvent.type(screen.getByLabelText('Email'), 'ana@example.com')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'secreta')
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }))

    await userEvent.click(await screen.findByRole('button', { name: 'Aceptar invitación' }))
    expect(location()).toHaveTextContent('/invitaciones/aceptar')
    expect(acceptInvitation).toHaveBeenCalledExactlyOnceWith(TOKEN)
  })

  it.each([
    ['invalid, used, revoked, expired or for another email (404)', httpError(404), 'El enlace no es válido o ha expirado.'],
    ['blank token (400)', httpError(400), 'El enlace no es válido o ha expirado.'],
    ['network failure', new AxiosError('Network Error', 'ERR_NETWORK'), 'No se pudo conectar con el servidor.'],
    ['server error', httpError(500), 'Ocurrió un error inesperado.'],
  ])('shows the generic message on %s and allows a new attempt', async (_label, failure, message) => {
    vi.mocked(acceptInvitation).mockRejectedValueOnce(failure)
    setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Aceptar invitación' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.queryByText(/Invitación aceptada/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Aceptar invitación' })).toBeEnabled()
  })

  it('offers to switch account when the invitation belongs to another email', async () => {
    vi.mocked(acceptInvitation).mockRejectedValue(httpError(404))
    setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Aceptar invitación' }))
    await screen.findByRole('alert')
    expect(screen.getByText('¿La invitación es para otra cuenta? Cierra sesión e ingresa con ese email.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument()
  })

  it('goes back to login keeping the token when the session expires during acceptance', async () => {
    vi.mocked(acceptInvitation).mockRejectedValue(httpError(401))
    const { queryClient, router } = setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Aceptar invitación' }))
    await screen.findByRole('alert')
    // What the app-wide 401 handler does (AppProviders): the session is gone.
    queryClient.setQueryData(authKeys.me, null)
    expect(await screen.findByRole('button', { name: 'Ingresar' })).toBeInTheDocument()
    expect(router.state.location.state).toEqual({
      from: { pathname: '/invitaciones/aceptar', state: { invitationToken: TOKEN } },
    })
  })

  it('without a token (lost on reload or an interrupted navigation) asks to reopen the link and calls nothing', async () => {
    setup('/invitaciones/aceptar')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No encontramos los datos de la invitación. Vuelve a abrir el enlace que recibiste por correo.',
    )
    expect(screen.queryByRole('button', { name: 'Aceptar invitación' })).not.toBeInTheDocument()
    expect(acceptInvitation).not.toHaveBeenCalled()
  })

  it('keeps the visible border of its outline links', async () => {
    setup('/invitaciones/aceptar')
    expect(await screen.findByRole('link', { name: 'Ir al inicio' })).not.toHaveClass('border-transparent')
  })

  it('keeps the visible border of "Ahora no" next to the confirmation', async () => {
    setup()
    expect(await screen.findByRole('link', { name: 'Ahora no' })).not.toHaveClass('border-transparent')
  })
})
