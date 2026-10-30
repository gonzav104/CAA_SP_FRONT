import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderAuthRoutes } from '@/test/renderAuthRoutes'
import { fetchCurrentUser, requestPasswordReset, resetPassword } from '../authApi'

vi.mock('../authApi')

const TOKEN = 'reset-tok-456'
const STRONG = 'Nueva#2026'

function httpError(status: number): AxiosError {
  const config = { headers: {} } as InternalAxiosRequestConfig
  return new AxiosError('failed', 'ERR_BAD_REQUEST', config, null, { status, statusText: '', headers: {}, config, data: {} })
}

const location = () => screen.getByTestId('location')

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.mocked(fetchCurrentUser).mockReset().mockResolvedValue(null)
    vi.mocked(requestPasswordReset).mockReset()
  })

  it('is reachable from login and asks for a link with the same answer for any email', async () => {
    vi.mocked(requestPasswordReset).mockResolvedValue(undefined)
    renderAuthRoutes('/login')
    await userEvent.click(await screen.findByRole('link', { name: 'Olvidé mi contraseña' }))
    await userEvent.type(screen.getByLabelText('Email'), 'quien@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }))

    expect(requestPasswordReset).toHaveBeenCalledExactlyOnceWith('quien@example.com')
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Si el email está registrado, vas a recibir un enlace para restablecer tu contraseña.',
    )
    await userEvent.click(screen.getByRole('link', { name: 'Volver a iniciar sesión' }))
    expect(location()).toHaveTextContent('/login')
  })

  it('validates the email before calling the server', async () => {
    renderAuthRoutes('/olvide-password')
    await userEvent.click(await screen.findByRole('button', { name: 'Enviar enlace' }))
    expect(await screen.findByText('Ingresá un email válido.')).toBeInTheDocument()
    expect(requestPasswordReset).not.toHaveBeenCalled()
  })

  it.each([
    [httpError(429), 'Demasiados intentos. Esperá unos minutos e intentá nuevamente.'],
    [new AxiosError('Network Error', 'ERR_NETWORK'), 'No se pudo conectar con el servidor.'],
    [httpError(500), 'Ocurrió un error inesperado. Intentá nuevamente.'],
  ])('shows the error and no success on %s', async (failure, message) => {
    vi.mocked(requestPasswordReset).mockRejectedValue(failure)
    renderAuthRoutes('/olvide-password')
    await userEvent.type(await screen.findByLabelText('Email'), 'quien@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})

describe('ResetPasswordPage', () => {
  const logSpy = vi.spyOn(console, 'log')

  beforeEach(() => {
    vi.mocked(fetchCurrentUser).mockReset().mockResolvedValue(null)
    vi.mocked(resetPassword).mockReset()
    logSpy.mockClear()
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    // The token never reaches logs nor Web Storage.
    for (const call of logSpy.mock.calls) expect(JSON.stringify(call)).not.toContain(TOKEN)
    expect(JSON.stringify({ ...localStorage })).not.toContain(TOKEN)
    expect(JSON.stringify({ ...sessionStorage })).not.toContain(TOKEN)
  })

  async function fillPasswords(password = STRONG, confirmation = password) {
    await userEvent.type(await screen.findByLabelText('Nueva contraseña'), password)
    await userEvent.type(screen.getByLabelText('Repite la nueva contraseña'), confirmation)
    await userEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }))
  }

  it('takes the token out of the URL, resets the password once and leads back to login', async () => {
    vi.mocked(resetPassword).mockResolvedValue(undefined)
    const { router } = renderAuthRoutes(`/restablecer-password?token=${TOKEN}`)
    await screen.findByLabelText('Nueva contraseña')
    expect(router.state.location.search).toBe('')

    await fillPasswords()

    expect(resetPassword).toHaveBeenCalledExactlyOnceWith({ token: TOKEN, password: STRONG })
    expect(await screen.findByRole('status')).toHaveTextContent('Tu contraseña fue restablecida correctamente.')
    await userEvent.click(screen.getByRole('link', { name: 'Ir a iniciar sesión' }))
    expect(location()).toHaveTextContent('/login')
  })

  it('checks strength and confirmation like the backend, without calling it', async () => {
    renderAuthRoutes(`/restablecer-password?token=${TOKEN}`)
    await fillPasswords('debil', 'otra')
    expect(
      await screen.findByText(
        'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un símbolo.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Las contraseñas no coinciden.')).toBeInTheDocument()
    expect(resetPassword).not.toHaveBeenCalled()
  })

  it('accepts a non-ASCII letter as a letter, not as the required symbol', async () => {
    renderAuthRoutes(`/restablecer-password?token=${TOKEN}`)
    await fillPasswords('Contraseña1')
    expect(await screen.findByText(/una mayúscula, una minúscula, un número y un símbolo/)).toHaveClass('text-destructive')
    expect(resetPassword).not.toHaveBeenCalled()
  })

  it('shows the generic message for an invalid, used or expired link, offering a new one', async () => {
    vi.mocked(resetPassword).mockRejectedValue(httpError(404))
    renderAuthRoutes(`/restablecer-password?token=${TOKEN}`)
    await fillPasswords()
    expect(await screen.findByRole('alert')).toHaveTextContent('El enlace no es válido o ha expirado.')
    expect(screen.getByRole('link', { name: 'Solicitar un nuevo enlace' })).toHaveAttribute('href', '/olvide-password')
    expect(screen.queryByText('Contraseña restablecida')).not.toBeInTheDocument()
  })

  it('explains what to do when there is no token (lost or never sent)', async () => {
    renderAuthRoutes('/restablecer-password')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El enlace no es válido o ha expirado. Abrí nuevamente el enlace que recibiste por correo o solicitá uno nuevo.',
    )
    expect(screen.queryByLabelText('Nueva contraseña')).not.toBeInTheDocument()
  })
})
