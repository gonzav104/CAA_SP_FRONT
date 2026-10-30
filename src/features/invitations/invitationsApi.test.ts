import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import { acceptInvitation } from './invitationsApi'

describe('acceptInvitation', () => {
  afterEach(() => vi.restoreAllMocks())

  it('POSTs the token in the body, never in the URL', async () => {
    const data = { tipo: 'ORGANIZACION', organizacionId: 'org-1', pacienteId: null }
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data })
    await expect(acceptInvitation('tok')).resolves.toBe(data)
    expect(post).toHaveBeenCalledExactlyOnceWith('/api/invitaciones/aceptar', { token: 'tok' })
  })
})
