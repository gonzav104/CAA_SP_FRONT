import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchCurrentUser } from '@/features/auth/authApi'
import { fetchBoards } from '@/features/boards/boardsApi'
import { boardsListResponse } from '@/features/boards/testing/fixtures'
import { fetchPatient } from '@/features/patients/patientsApi'
import { familyMember, therapist, therapistPatientsResponse } from '@/features/patients/testing/fixtures'
import { renderApp } from '@/test/renderApp'
import {
  fetchCollaborators,
  fetchFamilyInvitations,
  inviteCollaborator,
  revokeCollaborator,
  revokeFamilyInvitation,
  updateCollaboratorPermission,
} from '../collaboratorsApi'
import { collaboratorsListResponse, PATIENT_ID, pendingInvitationsResponse } from '../testing/fixtures'

vi.mock('@/features/auth/authApi')
vi.mock('@/features/patients/patientsApi')
vi.mock('@/features/boards/boardsApi')
vi.mock('../collaboratorsApi')

function httpError(status: number): AxiosError {
  const config = { headers: {} } as InternalAxiosRequestConfig
  return new AxiosError('failed', 'ERR_BAD_REQUEST', config, null, {
    status,
    statusText: '',
    headers: {},
    config,
    data: {},
  })
}

const invitationFor = (email: string) => ({
  ...pendingInvitationsResponse[0],
  id: `inv-${email}`,
  email,
  permisoPropuesto: 'LECTURA' as const,
})

async function submitInvitation(email: string) {
  await userEvent.click(await screen.findByRole('button', { name: 'Invitar familiar' }))
  await userEvent.type(screen.getByLabelText('Email del familiar'), email)
  await userEvent.click(screen.getByRole('button', { name: 'Enviar invitación' }))
}

const url = `/pacientes/${PATIENT_ID}/familia`

describe('CollaboratorsPage', () => {
  beforeEach(() => {
    vi.mocked(fetchCurrentUser).mockReset().mockResolvedValue(therapist)
    vi.mocked(fetchPatient).mockReset().mockResolvedValue(therapistPatientsResponse[0])
    vi.mocked(fetchBoards).mockReset().mockResolvedValue(boardsListResponse)
    vi.mocked(fetchCollaborators).mockReset().mockResolvedValue(collaboratorsListResponse)
    vi.mocked(fetchFamilyInvitations).mockReset().mockResolvedValue([])
    vi.mocked(inviteCollaborator).mockReset()
    vi.mocked(revokeFamilyInvitation).mockReset()
    vi.mocked(updateCollaboratorPermission).mockReset()
    vi.mocked(revokeCollaborator).mockReset()
  })

  it('shows the section title and the primary action together in the content header', async () => {
    renderApp(url)
    await screen.findByRole('heading', { name: 'Familia' })
    expect(screen.getByRole('button', { name: 'Invitar familiar' })).toBeInTheDocument()
  })

  it('lists collaborators with their real identity and permission', async () => {
    renderApp(url)
    expect(await screen.findByText('Leo Gómez')).toBeInTheDocument()
    expect(screen.getByText('Rosa Gómez')).toBeInTheDocument()
    expect(screen.getByText('leo@example.com')).toBeInTheDocument()
  })

  it('shows an empty state when there are no collaborators nor invitations', async () => {
    vi.mocked(fetchCollaborators).mockResolvedValue([])
    renderApp(url)
    expect(await screen.findByText('Todavía no hay familiares vinculados a este paciente.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Invitaciones pendientes' })).not.toBeInTheDocument()
  })

  describe('invitations', () => {
    it('sends an invitation (202) to an email without account: confirms it, lists it as pending, never as linked', async () => {
      vi.mocked(fetchCollaborators).mockResolvedValue([])
      vi.mocked(fetchFamilyInvitations).mockResolvedValueOnce([]).mockResolvedValue([invitationFor('nadie@example.com')])
      vi.mocked(inviteCollaborator).mockResolvedValue(invitationFor('nadie@example.com'))
      renderApp(url)
      await screen.findByText('Todavía no hay familiares vinculados a este paciente.')

      await submitInvitation('nadie@example.com')

      expect(inviteCollaborator).toHaveBeenCalledExactlyOnceWith(PATIENT_ID, { email: 'nadie@example.com', permiso: 'LECTURA' })
      expect(await screen.findByRole('status')).toHaveTextContent(
        'Invitación enviada a nadie@example.com. Tendrá acceso cuando la acepte.',
      )
      const pending = await screen.findByRole('list', { name: 'Invitaciones pendientes' })
      expect(within(pending).getByText('nadie@example.com')).toBeInTheDocument()
      // Still not a linked collaborator: the empty state stays and no permission control appears for it.
      expect(screen.getByText('Todavía no hay familiares vinculados a este paciente.')).toBeInTheDocument()
      expect(screen.queryByLabelText(/Permiso de/)).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Email del familiar')).not.toBeInTheDocument()
    })

    it('refreshes only the pending invitations after inviting', async () => {
      vi.mocked(inviteCollaborator).mockResolvedValue(invitationFor('nadie@example.com'))
      renderApp(url)
      await screen.findByText('Leo Gómez')
      await submitInvitation('nadie@example.com')
      await screen.findByRole('status')

      await vi.waitFor(() => expect(fetchFamilyInvitations).toHaveBeenCalledTimes(2))
      expect(fetchCollaborators).toHaveBeenCalledOnce()
    })

    it('shows pending invitations apart from linked family members, with their state', async () => {
      vi.mocked(fetchFamilyInvitations).mockResolvedValue(pendingInvitationsResponse)
      renderApp(url)
      const pending = await screen.findByRole('list', { name: 'Invitaciones pendientes' })
      const linked = screen.getByRole('list', { name: 'Familiares vinculados' })

      expect(within(pending).getByText('ana.nueva@example.com')).toBeInTheDocument()
      expect(within(pending).getByText(/Edición limitada/)).toBeInTheDocument()
      expect(within(pending).getByText('Invitación vencida')).toBeInTheDocument()
      expect(within(linked).queryByText('ana.nueva@example.com')).not.toBeInTheDocument()
      expect(within(pending).queryByText('Leo Gómez')).not.toBeInTheDocument()
    })

    it('revokes a pending invitation and refreshes the list', async () => {
      vi.mocked(fetchFamilyInvitations)
        .mockResolvedValueOnce(pendingInvitationsResponse)
        .mockResolvedValue([pendingInvitationsResponse[1]])
      vi.mocked(revokeFamilyInvitation).mockResolvedValue(undefined)
      renderApp(url)

      await userEvent.click(await screen.findByRole('button', { name: 'Revocar invitación a ana.nueva@example.com' }))

      expect(revokeFamilyInvitation).toHaveBeenCalledExactlyOnceWith(PATIENT_ID, 'inv-ana')
      await vi.waitFor(() => expect(screen.queryByText('ana.nueva@example.com')).not.toBeInTheDocument())
      expect(fetchFamilyInvitations).toHaveBeenCalledTimes(2)
      expect(fetchCollaborators).toHaveBeenCalledOnce()
    })

    it('resends an invitation by repeating the POST with the same email and permission', async () => {
      vi.mocked(fetchFamilyInvitations).mockResolvedValue(pendingInvitationsResponse)
      vi.mocked(inviteCollaborator).mockResolvedValue(pendingInvitationsResponse[1])
      renderApp(url)

      await userEvent.click(await screen.findByRole('button', { name: 'Reenviar invitación a vencida@example.com' }))

      expect(inviteCollaborator).toHaveBeenCalledExactlyOnceWith(PATIENT_ID, { email: 'vencida@example.com', permiso: 'LECTURA' })
      expect(await screen.findByRole('status')).toHaveTextContent('Invitación reenviada a vencida@example.com.')
    })

    it.each([
      [400, 'El servidor rechazó los datos.'],
      [401, 'Tu sesión expiró. Inicia sesión nuevamente.'],
      [403, 'No tienes permiso para invitar familiares a este paciente.'],
      [404, 'El paciente ya no existe o no tienes permiso para administrar su familia.'],
      [409, 'Esa persona ya es un familiar vinculado de este paciente.'],
    ])('on a %i keeps the form open with its message and shows no success', async (status, message) => {
      vi.mocked(inviteCollaborator).mockRejectedValue(httpError(status))
      renderApp(url)
      await screen.findByText('Leo Gómez')
      await submitInvitation('leo@example.com')

      expect(await screen.findByRole('alert')).toHaveTextContent(message)
      expect(screen.getByLabelText('Email del familiar')).toHaveValue('leo@example.com')
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
      expect(fetchFamilyInvitations).toHaveBeenCalledOnce()
    })

    it('shows the revoke error inline when it fails', async () => {
      vi.mocked(fetchFamilyInvitations).mockResolvedValue(pendingInvitationsResponse)
      vi.mocked(revokeFamilyInvitation).mockRejectedValue(httpError(404))
      renderApp(url)
      await userEvent.click(await screen.findByRole('button', { name: 'Revocar invitación a ana.nueva@example.com' }))
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'La invitación ya no existe o no tienes permiso para revocarla.',
      )
    })
  })

  it('changes a collaborator permission', async () => {
    vi.mocked(updateCollaboratorPermission).mockResolvedValue({ ...collaboratorsListResponse[0], permiso: 'EDICION_LIMITADA' })
    renderApp(url)
    const row = (await screen.findByText('Rosa Gómez')).closest('li')
    if (!row) throw new Error('row not found')
    await userEvent.selectOptions(within(row).getByLabelText('Permiso de Rosa Gómez'), 'EDICION_LIMITADA')
    expect(updateCollaboratorPermission).toHaveBeenCalledWith(PATIENT_ID, 'u-rosa', { permiso: 'EDICION_LIMITADA' })
  })

  it('revokes a collaborator after confirmation', async () => {
    vi.mocked(revokeCollaborator).mockResolvedValue(undefined)
    renderApp(url)
    const row = (await screen.findByText('Rosa Gómez')).closest('li')
    if (!row) throw new Error('row not found')
    await userEvent.click(within(row).getByRole('button', { name: 'Quitar acceso' }))
    await userEvent.click(within(row).getByRole('button', { name: 'Sí, quitar acceso' }))
    expect(revokeCollaborator).toHaveBeenCalledWith(PATIENT_ID, 'u-rosa')
  })

  it('shows a read error with retry', async () => {
    vi.mocked(fetchCollaborators).mockRejectedValueOnce(new Error('500')).mockResolvedValue(collaboratorsListResponse)
    renderApp(url)
    expect(await screen.findByRole('alert')).toHaveTextContent('Ocurrió un error inesperado.')
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Leo Gómez')).toBeInTheDocument()
  })

  it('opens the invitation form directly when the workspace nav shortcut is used', async () => {
    renderApp(`${url}?crear=1`)
    expect(await screen.findByLabelText('Email del familiar')).toBeInTheDocument()
  })

  it.each([
    ['LECTURA', [] as const],
    ['EDICION_LIMITADA', ['EDITAR_CONTENIDO'] as const],
  ])('a family member with %s sees no administration and requests nothing', async (miPermiso, capacidades) => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(familyMember)
    vi.mocked(fetchPatient).mockResolvedValue({
      ...therapistPatientsResponse[0],
      miPermiso: miPermiso as 'LECTURA' | 'EDICION_LIMITADA',
      capacidades: [...capacidades],
    })
    renderApp(url)
    expect(
      await screen.findByText('Solo el equipo clínico del paciente puede administrar a su familia.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Invitar familiar' })).not.toBeInTheDocument()
    expect(fetchCollaborators).not.toHaveBeenCalled()
    expect(fetchFamilyInvitations).not.toHaveBeenCalled()
  })
})
