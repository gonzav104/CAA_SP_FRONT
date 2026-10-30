import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GoogleAccountsId } from './googleIdentity'
import { GoogleSignInButton } from './GoogleSignInButton'

function fakeGoogle() {
  let callback: ((response: { credential?: string }) => void) | undefined
  const id: GoogleAccountsId = {
    initialize: vi.fn((config) => {
      callback = config.callback
    }),
    renderButton: vi.fn(),
    disableAutoSelect: vi.fn(),
  }
  window.google = { accounts: { id } }
  return { id, emit: (credential?: string) => callback?.({ credential }) }
}

describe('GoogleSignInButton', () => {
  afterEach(() => {
    delete window.google
    vi.unstubAllEnvs()
  })

  it('initializes GIS with the configured client ID and hands over only the ID token', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'client-123')
    const google = fakeGoogle()
    const onCredential = vi.fn()
    render(<GoogleSignInButton onCredential={onCredential} />)

    await vi.waitFor(() => expect(google.id.renderButton).toHaveBeenCalledOnce())
    expect(google.id.initialize).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: 'client-123', auto_select: false }),
    )
    google.emit('id-token-1')
    google.emit(undefined) // a closed/cancelled popup carries no credential: nothing happens
    expect(onCredential).toHaveBeenCalledExactlyOnceWith('id-token-1')
  })

  it('ignores a credential that arrives after the button was unmounted', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'client-123')
    const google = fakeGoogle()
    const onCredential = vi.fn()
    const { unmount } = render(<GoogleSignInButton onCredential={onCredential} />)
    await vi.waitFor(() => expect(google.id.renderButton).toHaveBeenCalled())
    unmount()
    google.emit('late-id-token')
    expect(onCredential).not.toHaveBeenCalled()
  })

  it('renders nothing without a client ID', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '')
    const { container } = render(<GoogleSignInButton onCredential={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('says Google is unavailable when its script cannot load', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'client-123')
    render(<GoogleSignInButton onCredential={vi.fn()} />)
    const script = document.head.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]')
    expect(script).not.toBeNull()
    script?.dispatchEvent(new Event('error'))
    expect(await screen.findByText('El acceso con Google no está disponible en este momento.')).toBeInTheDocument()
  })
})
