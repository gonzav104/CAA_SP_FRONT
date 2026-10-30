import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderAuthRoutes } from '@/test/renderAuthRoutes'
import { completeGoogleRecovery, fetchCurrentUser, login, register, resetPassword } from '../authApi'

vi.mock('../google/GoogleSignInButton', () => ({
  GoogleSignInButton: ({ onCredential }: { onCredential: (idToken: string) => void }) => (
    <button type="button" onClick={() => onCredential('google-id-token')}>
      Google (simulado)
    </button>
  ),
}))
vi.mock('../authApi')

const requirement = (name: RegExp) =>
  within(screen.getByRole('list', { name: 'Requisitos de la contraseña' })).getByText(name).closest('li')!

beforeEach(() => {
  vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client-id.apps.googleusercontent.com')
  vi.mocked(fetchCurrentUser).mockReset().mockResolvedValue(null)
  for (const fn of [login, register, resetPassword, completeGoogleRecovery]) vi.mocked(fn).mockReset()
})

describe('show / hide password', () => {
  it('login: hidden by default, toggles without losing the value or the focus, and logs in with it', async () => {
    renderAuthRoutes('/login')
    const password = await screen.findByLabelText('Contraseña')
    expect(password).toHaveAttribute('type', 'password')
    await userEvent.type(password, 'secret#1')

    await userEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }))
    expect(password).toHaveAttribute('type', 'text')
    expect(password).toHaveValue('secret#1')
    expect(password).toHaveFocus()

    await userEvent.click(screen.getByRole('button', { name: 'Ocultar contraseña' }))
    expect(password).toHaveAttribute('type', 'password')

    await userEvent.type(screen.getByLabelText('Email'), 'ana@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(login).toHaveBeenCalledExactlyOnceWith({ email: 'ana@example.com', password: 'secret#1' })
  })

  it('is reachable by keyboard', async () => {
    renderAuthRoutes('/login')
    await userEvent.type(await screen.findByLabelText('Contraseña'), 'abc')
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Mostrar contraseña' })).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'text')
    expect(screen.getByLabelText('Contraseña')).toHaveValue('abc')
  })
})

describe('registro', () => {
  it('labels the name "Nombre completo" and still sends it as nombre', async () => {
    renderAuthRoutes('/registro')
    await userEvent.type(await screen.findByLabelText('Nombre completo'), '  Ana Pérez ')
    await userEvent.type(screen.getByLabelText('Email'), 'ana@example.com')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'Segura#2026')
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    expect(register).toHaveBeenCalledExactlyOnceWith({ nombre: 'Ana Pérez', email: 'ana@example.com', password: 'Segura#2026' })
  })

  it('updates the requirements while typing, in text and not only color, with no error before submitting', async () => {
    renderAuthRoutes('/registro')
    const password = await screen.findByLabelText('Contraseña')
    for (const name of [/8 caracteres/, /mayúscula/, /número/, /símbolo/]) {
      expect(requirement(name)).toHaveTextContent(/^Falta:/)
    }

    await userEvent.type(password, 'abcdefgh')
    expect(requirement(/8 caracteres/)).toHaveTextContent(/^Cumplido:/)
    expect(requirement(/mayúscula/)).toHaveTextContent(/^Falta:/)
    expect(screen.queryByText(/La contraseña debe tener/)).not.toBeInTheDocument()
    expect(password).not.toHaveAttribute('aria-invalid')

    await userEvent.type(password, 'A1')
    expect(requirement(/mayúscula/)).toHaveTextContent(/^Cumplido:/)
    expect(requirement(/número/)).toHaveTextContent(/^Cumplido:/)
    expect(requirement(/símbolo/)).toHaveTextContent(/^Falta:/)

    await userEvent.type(password, '#')
    for (const name of [/8 caracteres/, /mayúscula/, /número/, /símbolo/]) {
      expect(requirement(name)).toHaveTextContent(/^Cumplido:/)
    }
  })

  it('an invalid password is refused locally with the rule message and the missing part', async () => {
    renderAuthRoutes('/registro')
    await userEvent.type(await screen.findByLabelText('Nombre completo'), 'Ana')
    await userEvent.type(screen.getByLabelText('Email'), 'ana@example.com')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'Segura2026')
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByText(/La contraseña debe tener al menos 8 caracteres/)).toBeInTheDocument()
    expect(requirement(/símbolo/)).toHaveTextContent(/^Falta:/)
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('aria-invalid', 'true')
    expect(register).not.toHaveBeenCalled()
  })
})

describe('restablecer contraseña', () => {
  it('shows the toggle and the live requirements, and keeps the token flow', async () => {
    renderAuthRoutes('/restablecer-password?token=tok-123')
    const password = await screen.findByLabelText('Nueva contraseña')
    await userEvent.type(password, 'Nueva#2026')
    expect(requirement(/símbolo/)).toHaveTextContent(/^Cumplido:/)
    await userEvent.click(screen.getAllByRole('button', { name: 'Mostrar contraseña' })[0])
    expect(password).toHaveAttribute('type', 'text')
    expect(password).toHaveValue('Nueva#2026')

    await userEvent.type(screen.getByLabelText('Repite la nueva contraseña'), 'Nueva#2026')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }))
    expect(resetPassword).toHaveBeenCalledExactlyOnceWith({ token: 'tok-123', password: 'Nueva#2026' })
  })
})

describe('recuperación Google', () => {
  it('keeps the "distinta" notice and the double check, with the same field improvements', async () => {
    renderAuthRoutes('/recuperar-google?token=rec-1')
    const password = await screen.findByLabelText('Nueva contraseña', { exact: true })
    expect(screen.getByText('Tiene que ser distinta de tu contraseña actual.')).toBeInTheDocument()
    await userEvent.type(password, 'debil')
    expect(requirement(/8 caracteres/)).toHaveTextContent(/^Falta:/)
    await userEvent.click(screen.getAllByRole('button', { name: 'Mostrar contraseña' })[0])
    expect(password).toHaveValue('debil')

    await userEvent.type(screen.getByLabelText('Repite la nueva contraseña'), 'debil')
    await userEvent.click(screen.getByRole('button', { name: 'Google (simulado)' }))
    expect(await screen.findByText(/La contraseña debe tener al menos 8 caracteres/)).toBeInTheDocument()
    expect(completeGoogleRecovery).not.toHaveBeenCalled()
  })
})
