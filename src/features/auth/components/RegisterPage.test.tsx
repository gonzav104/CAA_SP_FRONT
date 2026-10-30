import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { acceptInvitation } from '@/features/invitations/invitationsApi'
import { renderAuthRoutes } from '@/test/renderAuthRoutes'
import { fetchCurrentUser, login, register } from '../authApi'
import type { CurrentUser } from '../types'

vi.mock('../authApi')
vi.mock('@/features/invitations/invitationsApi')

const STRONG = 'Segura#2026'
const newUser: CurrentUser = { id: 'u-new', email: 'nueva@example.com', nombre: 'Nueva', creadoEn: '2026-10-29T10:00:00' }

function httpError(status: number, message?: string): AxiosError {
  const config = { headers: {} } as InternalAxiosRequestConfig
  const data = message ? { timestamp: '2026-10-29T10:00:00', status, error: 'Bad Request', message } : {}
  return new AxiosError('failed', 'ERR_BAD_REQUEST', config, null, { status, statusText: '', headers: {}, config, data })
}

const location = () => screen.getByTestId('location')

async function fillRegistration(password = STRONG) {
  await userEvent.type(await screen.findByLabelText('Nombre'), 'Nueva')
  await userEvent.type(screen.getByLabelText('Email'), 'nueva@example.com')
  await userEvent.type(screen.getByLabelText('Contraseña'), password)
  await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))
}

async function logIn() {
  await userEvent.type(await screen.findByLabelText('Email'), 'nueva@example.com')
  await userEvent.type(screen.getByLabelText('Contraseña'), STRONG)
  await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }))
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.mocked(fetchCurrentUser).mockReset().mockResolvedValue(null)
    vi.mocked(register).mockReset()
    vi.mocked(login).mockReset()
    vi.mocked(acceptInvitation).mockReset()
  })

  it('is reachable from login, registers identity only and goes to login without a session', async () => {
    vi.mocked(register).mockResolvedValue(newUser)
    renderAuthRoutes('/login')
    await userEvent.click(await screen.findByRole('link', { name: 'Crear cuenta' }))
    await fillRegistration()

    expect(register).toHaveBeenCalledExactlyOnceWith({ nombre: 'Nueva', email: 'nueva@example.com', password: STRONG })
    expect(await screen.findByRole('status')).toHaveTextContent('Tu cuenta fue creada. Ya puedes iniciar sesión.')
    expect(location()).toHaveTextContent('/login')
    expect(login).not.toHaveBeenCalled()
  })

  it('validates name, email and password strength like the backend', async () => {
    renderAuthRoutes('/registro')
    await userEvent.click(await screen.findByRole('button', { name: 'Crear cuenta' }))
    expect(await screen.findByText('Ingresa tu nombre.')).toBeInTheDocument()
    expect(screen.getByText('Ingresa un email válido.')).toBeInTheDocument()
    expect(screen.getByText('Ingresa una contraseña.')).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Contraseña'), 'sinsimbolo1A')
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    expect(
      await screen.findByText(
        'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un símbolo.',
      ),
    ).toBeInTheDocument()
    expect(register).not.toHaveBeenCalled()
  })

  it.each([
    ['an existing email (409)', httpError(409), 'Ya existe una cuenta con ese email. Inicia sesión o recupera tu contraseña.'],
    ['a backend validation (400)', httpError(400, 'El email no es válido'), 'El email no es válido'],
    ['a server error', httpError(500), 'Ocurrió un error inesperado. Intenta nuevamente.'],
    ['a network failure', new AxiosError('Network Error', 'ERR_NETWORK'), 'No se pudo conectar con el servidor.'],
  ])('stays on the form on %s', async (_label, failure, message) => {
    vi.mocked(register).mockRejectedValue(failure)
    renderAuthRoutes('/registro')
    await fillRegistration()
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(location()).toHaveTextContent('/registro')
  })

  it('invitation → no account → register → login → back to the invitation, accepted only on confirmation', async () => {
    const token = 'inv-tok-789'
    vi.mocked(register).mockResolvedValue(newUser)
    vi.mocked(login).mockResolvedValue({ token: null, tipo: 'Bearer' })
    vi.mocked(fetchCurrentUser).mockResolvedValueOnce(null).mockResolvedValue(newUser)
    vi.mocked(acceptInvitation).mockResolvedValue({ tipo: 'PACIENTE_FAMILIAR', organizacionId: null, pacienteId: 'p-9' })
    const { router } = renderAuthRoutes(`/invitaciones/aceptar?token=${token}`)

    await userEvent.click(await screen.findByRole('link', { name: 'Crear cuenta' }))
    expect(location()).toHaveTextContent('/registro')
    expect(router.state.location.search).toBe('')
    await fillRegistration()
    await screen.findByText('Tu cuenta fue creada. Ya puedes iniciar sesión.')
    await logIn()

    const accept = await screen.findByRole('button', { name: 'Aceptar invitación' })
    expect(location()).toHaveTextContent('/invitaciones/aceptar')
    expect(acceptInvitation).not.toHaveBeenCalled()
    await userEvent.click(accept)

    expect(await screen.findByText('Ya tienes acceso al paciente.')).toBeInTheDocument()
    expect(acceptInvitation).toHaveBeenCalledExactlyOnceWith(token)
    expect(JSON.stringify({ ...localStorage, ...sessionStorage })).not.toContain(token)
    await userEvent.click(screen.getByRole('link', { name: 'Ir al paciente' }))
    expect(location()).toHaveTextContent('/pacientes/p-9/cartillas')
  })
})
