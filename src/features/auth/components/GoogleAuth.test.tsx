import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { acceptInvitation } from '@/features/invitations/invitationsApi'
import { organizationKeys } from '@/features/organizations/hooks'
import { patientKeys } from '@/features/patients/hooks'
import { renderAuthRoutes } from '@/test/renderAuthRoutes'
import {
  completeGoogleRecovery,
  completeGoogleRegistration,
  fetchCurrentUser,
  googleLogin,
  login,
  requestGoogleRecovery,
} from '../authApi'
import type { CurrentUser } from '../types'

// The real button needs Google Identity Services in a browser; here it hands over a fake ID token.
// These tests prove the frontend contract with mocks; they are not a check against real Google.
vi.mock('../google/GoogleSignInButton', () => ({
  GoogleSignInButton: ({ onCredential }: { onCredential: (idToken: string) => void }) => (
    <button type="button" onClick={() => onCredential(ID_TOKEN)}>
      Google (simulado)
    </button>
  ),
}))
vi.mock('../authApi')
vi.mock('@/features/invitations/invitationsApi')

const ID_TOKEN = 'google-id-token-abc'
const RECOVERY_TOKEN = 'google-recovery-tok-xyz'
const STRONG = 'Nueva#2026'
const user: CurrentUser = { id: 'u-g', email: 'gina@gmail.com', nombre: 'Gina', creadoEn: '2026-10-29T10:00:00' }

function httpError(status: number): AxiosError {
  const config = { headers: {} } as InternalAxiosRequestConfig
  return new AxiosError('failed', 'ERR_BAD_REQUEST', config, null, { status, statusText: '', headers: {}, config, data: {} })
}

const location = () => screen.getByTestId('location')
const linked = { requiereRegistro: false, tipo: 'Bearer', email: null, nombre: null }
const GENERIC_GOOGLE_MESSAGE =
  'No pudimos ingresar con esa cuenta de Google. Si ya tenés una cuenta con ese email, ingresá con tu contraseña o recuperá el acceso con Google.'

beforeEach(() => {
  vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client-id.apps.googleusercontent.com')
  vi.mocked(fetchCurrentUser).mockReset().mockResolvedValue(null)
  for (const fn of [googleLogin, completeGoogleRegistration, requestGoogleRecovery, completeGoogleRecovery, login, acceptInvitation]) {
    vi.mocked(fn).mockReset()
  }
  localStorage.clear()
  sessionStorage.clear()
})

afterEach(() => {
  // Neither Google ID tokens nor e-mailed tokens are ever kept in persistent storage.
  const stored = JSON.stringify({ ...localStorage, ...sessionStorage })
  expect(stored).not.toContain(ID_TOKEN)
  expect(stored).not.toContain(RECOVERY_TOKEN)
  vi.unstubAllEnvs()
})

describe('Google login', () => {
  it('logs a linked account in, confirms the session with /me and goes to the destination', async () => {
    vi.mocked(googleLogin).mockResolvedValue(linked)
    vi.mocked(fetchCurrentUser).mockResolvedValueOnce(null).mockResolvedValue(user)
    renderAuthRoutes('/login')

    await userEvent.click(await screen.findByRole('button', { name: 'Google (simulado)' }))

    expect(googleLogin).toHaveBeenCalledExactlyOnceWith(ID_TOKEN)
    await screen.findByText('Dashboard stub')
    expect(completeGoogleRegistration).not.toHaveBeenCalled()
  })

  it('drops data cached for a previous account when the new session starts', async () => {
    vi.mocked(googleLogin).mockResolvedValue(linked)
    vi.mocked(fetchCurrentUser).mockResolvedValueOnce(null).mockResolvedValue(user)
    const { queryClient } = renderAuthRoutes('/login')
    // Left behind by an expired session of someone else in this browser.
    queryClient.setQueryData(patientKeys.list(), [{ id: 'p-otro' }])
    queryClient.setQueryData(organizationKeys.all, [{ id: 'org-otro' }])

    await userEvent.click(await screen.findByRole('button', { name: 'Google (simulado)' }))
    await screen.findByText('Dashboard stub')

    expect(queryClient.getQueryData(patientKeys.list())).toBeUndefined()
    expect(queryClient.getQueryData(organizationKeys.all)).toBeUndefined()
  })

  it('sends a single request when Google delivers two credentials before re-rendering', async () => {
    vi.mocked(googleLogin).mockReturnValue(new Promise(() => {}))
    renderAuthRoutes('/login')
    const button = await screen.findByRole('button', { name: 'Google (simulado)' })
    fireEvent.click(button)
    fireEvent.click(button)
    await vi.waitFor(() => expect(googleLogin).toHaveBeenCalled())
    expect(googleLogin).toHaveBeenCalledOnce()
  })

  it('asks to confirm a first Google registration, creates identity only, then logs in', async () => {
    vi.mocked(googleLogin).mockResolvedValue({ requiereRegistro: true, tipo: null, email: 'gina@gmail.com', nombre: 'Gina' })
    vi.mocked(completeGoogleRegistration).mockResolvedValue(linked)
    renderAuthRoutes('/login')

    await userEvent.click(await screen.findByRole('button', { name: 'Google (simulado)' }))
    expect(await screen.findByText('No hay una cuenta para gina@gmail.com. ¿Querés crearla a nombre de Gina?')).toBeInTheDocument()
    // Nothing was created nor authenticated yet.
    expect(completeGoogleRegistration).not.toHaveBeenCalled()
    expect(location()).toHaveTextContent('/login')

    vi.mocked(fetchCurrentUser).mockResolvedValue(user)
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(completeGoogleRegistration).toHaveBeenCalledExactlyOnceWith(ID_TOKEN)
    await screen.findByText('Dashboard stub')
    // Only identity endpoints were called: no role, organization or permission is chosen by the frontend.
    expect(login).not.toHaveBeenCalled()
    expect(acceptInvitation).not.toHaveBeenCalled()
  })

  it('cancelling the Google registration creates nothing', async () => {
    vi.mocked(googleLogin).mockResolvedValue({ requiereRegistro: true, tipo: null, email: 'gina@gmail.com', nombre: 'Gina' })
    renderAuthRoutes('/login')
    await userEvent.click(await screen.findByRole('button', { name: 'Google (simulado)' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar' }))
    expect(screen.getByRole('button', { name: 'Google (simulado)' })).toBeInTheDocument()
    expect(completeGoogleRegistration).not.toHaveBeenCalled()
  })

  it('never links an existing e-mail without Google link: generic message and the recovery option', async () => {
    vi.mocked(googleLogin).mockRejectedValue(httpError(401))
    renderAuthRoutes('/login')
    await userEvent.click(await screen.findByRole('button', { name: 'Google (simulado)' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(GENERIC_GOOGLE_MESSAGE)
    expect(screen.getByRole('link', { name: 'Recuperar el acceso con Google' })).toHaveAttribute('href', '/recuperar-google')
    expect(completeGoogleRegistration).not.toHaveBeenCalled()
    expect(location()).toHaveTextContent('/login')
  })

  it('shows the same generic message when the registration hits a conflicting identity', async () => {
    vi.mocked(googleLogin).mockResolvedValue({ requiereRegistro: true, tipo: null, email: 'gina@gmail.com', nombre: null })
    vi.mocked(completeGoogleRegistration).mockRejectedValue(httpError(401))
    renderAuthRoutes('/login')
    await userEvent.click(await screen.findByRole('button', { name: 'Google (simulado)' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Crear cuenta' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(GENERIC_GOOGLE_MESSAGE)
    expect(location()).toHaveTextContent('/login')
  })

  it.each([
    ['a blocked session cookie', null, 'No se pudo iniciar la sesión. Verificá que el navegador permita cookies.'],
    ['a network failure', new AxiosError('Network Error', 'ERR_NETWORK'), 'No se pudo conectar con el servidor.'],
    ['too many attempts', httpError(429), 'Demasiados intentos. Esperá unos minutos e intentá nuevamente.'],
  ])('reports %s without logging in', async (_label, failure, message) => {
    if (failure) vi.mocked(googleLogin).mockRejectedValue(failure)
    else vi.mocked(googleLogin).mockResolvedValue(linked)
    renderAuthRoutes('/login')
    await userEvent.click(await screen.findByRole('button', { name: 'Google (simulado)' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(location()).toHaveTextContent('/login')
  })

  it('returns to a pending invitation after Google login, without accepting it', async () => {
    vi.mocked(googleLogin).mockResolvedValue(linked)
    vi.mocked(fetchCurrentUser).mockResolvedValueOnce(null).mockResolvedValue(user)
    const { router } = renderAuthRoutes('/invitaciones/aceptar?token=inv-tok-1')

    await userEvent.click(await screen.findByRole('button', { name: 'Google (simulado)' }))

    expect(await screen.findByRole('button', { name: 'Aceptar invitación' })).toBeInTheDocument()
    expect(location()).toHaveTextContent('/invitaciones/aceptar')
    expect(router.state.location.state).toEqual({ invitationToken: 'inv-tok-1' })
    expect(acceptInvitation).not.toHaveBeenCalled()
  })

  it('hides Google entirely when no client ID is configured', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '')
    renderAuthRoutes('/login')
    await screen.findByRole('button', { name: 'Ingresar' })
    expect(screen.queryByRole('button', { name: 'Google (simulado)' })).not.toBeInTheDocument()
  })
})

describe('Google identity recovery', () => {
  it('requests the e-mailed challenge with a Google proof and answers generically', async () => {
    vi.mocked(requestGoogleRecovery).mockResolvedValue(undefined)
    renderAuthRoutes('/recuperar-google')
    await userEvent.click(await screen.findByRole('button', { name: 'Google (simulado)' }))
    expect(requestGoogleRecovery).toHaveBeenCalledExactlyOnceWith(ID_TOKEN)
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Si la cuenta es elegible, recibirás un enlace para recuperar el acceso con Google.',
    )
  })

  it('reports an invalid Google proof or rate limit on the request', async () => {
    vi.mocked(requestGoogleRecovery).mockRejectedValue(httpError(429))
    renderAuthRoutes('/recuperar-google')
    await userEvent.click(await screen.findByRole('button', { name: 'Google (simulado)' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Demasiados intentos.')
  })

  async function fillPasswords(password = STRONG, confirmation = password) {
    await userEvent.type(await screen.findByLabelText('Nueva contraseña'), password)
    await userEvent.type(screen.getByLabelText('Repetí la nueva contraseña'), confirmation)
  }

  it('completes with both proofs (e-mail token + Google ID token) and a new password, then logs in', async () => {
    vi.mocked(completeGoogleRecovery).mockResolvedValue(linked)
    const { router } = renderAuthRoutes(`/recuperar-google?token=${RECOVERY_TOKEN}`)
    await fillPasswords()
    expect(router.state.location.search).toBe('')

    vi.mocked(fetchCurrentUser).mockResolvedValue(user)
    await userEvent.click(screen.getByRole('button', { name: 'Google (simulado)' }))

    expect(completeGoogleRecovery).toHaveBeenCalledExactlyOnceWith({
      idToken: ID_TOKEN,
      token: RECOVERY_TOKEN,
      password: STRONG,
    })
    await screen.findByText('Dashboard stub')
  })

  it('never sends the single-use recovery twice, even on a double confirmation', async () => {
    vi.mocked(completeGoogleRecovery).mockReturnValue(new Promise(() => {}))
    renderAuthRoutes(`/recuperar-google?token=${RECOVERY_TOKEN}`)
    await fillPasswords()
    const button = screen.getByRole('button', { name: 'Google (simulado)' })
    fireEvent.click(button)
    fireEvent.click(button)
    await vi.waitFor(() => expect(completeGoogleRecovery).toHaveBeenCalled())
    expect(completeGoogleRecovery).toHaveBeenCalledOnce()
  })

  it('a recovery done while signed in as someone else drops that account cached data', async () => {
    vi.mocked(completeGoogleRecovery).mockResolvedValue(linked)
    const { queryClient } = renderAuthRoutes(`/recuperar-google?token=${RECOVERY_TOKEN}`)
    queryClient.setQueryData(patientKeys.list(), [{ id: 'p-otro' }])
    await fillPasswords()
    vi.mocked(fetchCurrentUser).mockResolvedValue(user)
    await userEvent.click(screen.getByRole('button', { name: 'Google (simulado)' }))
    await screen.findByText('Dashboard stub')
    expect(queryClient.getQueryData(patientKeys.list())).toBeUndefined()
  })

  it('validates the new password before sending any proof', async () => {
    renderAuthRoutes(`/recuperar-google?token=${RECOVERY_TOKEN}`)
    await fillPasswords('debil', 'otra')
    await userEvent.click(screen.getByRole('button', { name: 'Google (simulado)' }))
    expect(await screen.findByText('Las contraseñas no coinciden.')).toBeInTheDocument()
    expect(completeGoogleRecovery).not.toHaveBeenCalled()
  })

  it('tells up front that the new password must differ from the current one', async () => {
    renderAuthRoutes(`/recuperar-google?token=${RECOVERY_TOKEN}`)
    expect(await screen.findByText(/Tiene que ser distinta de tu contraseña actual\./)).toBeInTheDocument()
  })

  it('on the generic 401 lists the three things to check, so the error is actionable', async () => {
    vi.mocked(completeGoogleRecovery).mockRejectedValue(httpError(401))
    renderAuthRoutes(`/recuperar-google?token=${RECOVERY_TOKEN}`)
    await fillPasswords()
    await userEvent.click(screen.getByRole('button', { name: 'Google (simulado)' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No se pudo recuperar el acceso.')
    expect(alert).toHaveTextContent('la nueva contraseña sea distinta de la actual')
    expect(alert).toHaveTextContent('la misma cuenta de Google con la que pediste el enlace')
    expect(alert).toHaveTextContent('el enlace no esté vencido ni usado')
    expect(location()).toHaveTextContent('/recuperar-google')
    expect(screen.getByRole('link', { name: 'Solicitar un nuevo enlace' })).toBeInTheDocument()
  })

  it('after a rejection keeps what was typed and the link token, so a different password can be retried', async () => {
    vi.mocked(completeGoogleRecovery).mockRejectedValueOnce(httpError(401)).mockResolvedValueOnce(linked)
    const { router } = renderAuthRoutes(`/recuperar-google?token=${RECOVERY_TOKEN}`)
    await fillPasswords()
    await userEvent.click(screen.getByRole('button', { name: 'Google (simulado)' }))
    await screen.findByRole('alert')

    // Nothing was cleared: the fields keep their values and the token is still in the history state, not in the URL.
    expect(screen.getByLabelText('Nueva contraseña', { exact: true })).toHaveValue(STRONG)
    expect(router.state.location.search).toBe('')

    const OTHER = 'Otra#Clave2027'
    await userEvent.clear(screen.getByLabelText('Nueva contraseña', { exact: true }))
    await userEvent.clear(screen.getByLabelText('Repetí la nueva contraseña'))
    await userEvent.type(screen.getByLabelText('Nueva contraseña', { exact: true }), OTHER)
    await userEvent.type(screen.getByLabelText('Repetí la nueva contraseña'), OTHER)
    vi.mocked(fetchCurrentUser).mockResolvedValue(user)
    await userEvent.click(screen.getByRole('button', { name: 'Google (simulado)' }))

    await screen.findByText('Dashboard stub')
    expect(completeGoogleRecovery).toHaveBeenCalledTimes(2)
    expect(vi.mocked(completeGoogleRecovery).mock.calls[0][0]).toEqual({ idToken: ID_TOKEN, token: RECOVERY_TOKEN, password: STRONG })
    expect(vi.mocked(completeGoogleRecovery).mock.calls[1][0]).toEqual({ idToken: ID_TOKEN, token: RECOVERY_TOKEN, password: OTHER })
  })
})
