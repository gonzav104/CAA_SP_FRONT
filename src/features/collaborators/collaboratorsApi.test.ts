import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import { fetchFamilyInvitations, inviteCollaborator, revokeFamilyInvitation } from './collaboratorsApi'
import { isInvitationExpired, toFamilyInvitations } from './mappers'
import { pendingInvitationsResponse } from './testing/fixtures'

describe('collaboratorsApi invitations', () => {
  afterEach(() => vi.restoreAllMocks())

  it('inviteCollaborator POSTs the registro DTO and returns the 202 invitation, not a collaborator', async () => {
    const request = { email: 'nadie@example.com', permiso: 'LECTURA' as const }
    const post = vi.spyOn(api, 'post').mockResolvedValue({ status: 202, data: pendingInvitationsResponse[0] })
    await expect(inviteCollaborator('p 1', request)).resolves.toBe(pendingInvitationsResponse[0])
    expect(post).toHaveBeenCalledExactlyOnceWith('/api/pacientes/p%201/colaboradores', request)
  })

  it('fetchFamilyInvitations reads the patient invitations', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: pendingInvitationsResponse })
    await expect(fetchFamilyInvitations('p-1')).resolves.toBe(pendingInvitationsResponse)
    expect(get).toHaveBeenCalledExactlyOnceWith('/api/pacientes/p-1/invitaciones')
  })

  it('revokeFamilyInvitation DELETEs the encoded invitation', async () => {
    const del = vi.spyOn(api, 'delete').mockResolvedValue({ status: 204 })
    await revokeFamilyInvitation('p-1', 'inv 1')
    expect(del).toHaveBeenCalledExactlyOnceWith('/api/pacientes/p-1/invitaciones/inv%201')
  })
})

describe('family invitation mapping', () => {
  it('keeps only family invitations, sorted by email', () => {
    const organization = { ...pendingInvitationsResponse[0], id: 'inv-org', tipo: 'ORGANIZACION' as const, email: 'a@x.com' }
    const result = toFamilyInvitations([...pendingInvitationsResponse].reverse().concat(organization))
    expect(result.map((invitation) => invitation.id)).toEqual(['inv-ana', 'inv-old'])
    expect(result[0]).toEqual({
      id: 'inv-ana',
      email: 'ana.nueva@example.com',
      permission: 'EDICION_LIMITADA',
      status: 'PENDIENTE',
      expiresAt: '2999-01-08T09:00:00',
    })
  })

  it('treats a past expiration or the EXPIRADA state as expired', () => {
    const [valid, old] = toFamilyInvitations(pendingInvitationsResponse)
    const now = new Date('2026-06-01T00:00:00')
    expect(isInvitationExpired(valid, now)).toBe(false)
    expect(isInvitationExpired(old, now)).toBe(true)
    expect(isInvitationExpired({ ...valid, status: 'EXPIRADA' }, now)).toBe(true)
    expect(isInvitationExpired({ ...valid, expiresAt: null }, now)).toBe(false)
  })
})
