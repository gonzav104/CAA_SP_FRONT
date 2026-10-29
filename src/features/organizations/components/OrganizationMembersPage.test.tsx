import { focusManager } from '@tanstack/react-query'
import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchCurrentUser } from '@/features/auth/authApi'
import type { InvitacionResponse } from '@/features/collaborators/apiTypes'
import { fetchPatients } from '@/features/patients/patientsApi'
import { therapist } from '@/features/patients/testing/fixtures'
import { renderApp } from '@/test/renderApp'
import type { MiembroResponse, OrganizacionResponse } from '../apiTypes'
import {
  changeMemberRole,
  changeMemberTherapist,
  fetchMembers,
  fetchOrganizationInvitations,
  inviteToOrganization,
  removeMember,
  revokeOrganizationInvitation,
} from '../membersApi'
import { fetchOrganizations } from '../organizationsApi'
import { adminOrganization, ownerOrganization } from '../testing/fixtures'

vi.mock('@/features/auth/authApi')
vi.mock('@/features/patients/patientsApi')
vi.mock('../organizationsApi')
vi.mock('../membersApi')

const ORG = ownerOrganization.id
const url = `/espacios/${ORG}/miembros`

const member = (overrides: Partial<MiembroResponse>): MiembroResponse => ({
  usuarioId: 'u-x',
  nombre: 'X',
  email: 'x@example.com',
  rolGestion: 'MIEMBRO',
  esTerapeuta: false,
  unidoEn: '2026-01-01T00:00:00',
  ...overrides,
})

// `therapist` (Ana) is the signed-in user; she is the OWNER unless a test says otherwise.
const ana = member({ usuarioId: therapist.id, nombre: 'Ana', email: 'ana@example.com', rolGestion: 'OWNER', esTerapeuta: true })
const bruno = member({ usuarioId: 'u-bruno', nombre: 'Bruno', email: 'bruno@example.com', rolGestion: 'ADMIN', esTerapeuta: true })
const carla = member({ usuarioId: 'u-carla', nombre: 'Carla', email: 'carla@example.com', rolGestion: 'MIEMBRO', esTerapeuta: false })

const pendingInvitation: InvitacionResponse = {
  id: 'inv-dani',
  tipo: 'ORGANIZACION',
  email: 'dani@example.com',
  rolGestionPropuesto: 'MIEMBRO',
  esTerapeutaPropuesto: true,
  permisoPropuesto: null,
  estado: 'PENDIENTE',
  expiraEn: '2999-01-01T00:00:00',
}

function httpError(status: number, message?: string): AxiosError {
  const config = { headers: {} } as InternalAxiosRequestConfig
  const data = message ? { timestamp: '2026-01-01T00:00:00', status, error: 'Bad Request', message } : {}
  return new AxiosError('failed', 'ERR_BAD_REQUEST', config, null, { status, statusText: '', headers: {}, config, data })
}

function setup(myOrganization: OrganizacionResponse, members: MiembroResponse[] = [ana, bruno, carla]) {
  vi.mocked(fetchOrganizations).mockResolvedValue([myOrganization])
  vi.mocked(fetchMembers).mockResolvedValue(members)
}

const rowOf = async (name: string) => {
  const list = await screen.findByRole('list', { name: 'Miembros del espacio' })
  const row = within(list).getByText(name, { exact: false, selector: 'span.font-medium' }).closest('li')
  if (!row) throw new Error(`row ${name} not found`)
  return row
}

describe('OrganizationMembersPage', () => {
  beforeEach(() => {
    vi.mocked(fetchCurrentUser).mockReset().mockResolvedValue(therapist)
    vi.mocked(fetchPatients).mockReset().mockResolvedValue([])
    for (const fn of [
      fetchOrganizations,
      fetchMembers,
      fetchOrganizationInvitations,
      inviteToOrganization,
      revokeOrganizationInvitation,
      changeMemberRole,
      changeMemberTherapist,
      removeMember,
    ]) {
      vi.mocked(fn).mockReset()
    }
    vi.mocked(fetchOrganizationInvitations).mockResolvedValue([])
  })

  it('lists members with their management role and clinical capacity', async () => {
    setup(ownerOrganization)
    renderApp(url)
    expect(within(await rowOf('Ana')).getByText('Propietario · Terapeuta')).toBeInTheDocument()
    expect(within(await rowOf('Bruno')).getByText('Administrador · Terapeuta')).toBeInTheDocument()
    expect(within(await rowOf('Carla')).getByText('Miembro', { selector: 'span' })).toBeInTheDocument()
  })

  it('OWNER: changes roles of others (never the OWNER), toggles therapists and removes with confirmation', async () => {
    setup(ownerOrganization)
    vi.mocked(changeMemberRole).mockResolvedValue({ ...carla, rolGestion: 'ADMIN' })
    vi.mocked(removeMember).mockResolvedValue(undefined)
    renderApp(url)

    const anaRow = await rowOf('Ana')
    expect(within(anaRow).queryByLabelText(/Rol de gestión de/)).not.toBeInTheDocument()
    expect(within(anaRow).queryByRole('button', { name: /Salir|Quitar del espacio/ })).not.toBeInTheDocument()

    const carlaRow = await rowOf('Carla')
    await userEvent.selectOptions(within(carlaRow).getByLabelText('Rol de gestión de Carla'), 'ADMIN')
    expect(changeMemberRole).toHaveBeenCalledExactlyOnceWith(ORG, 'u-carla', 'ADMIN')

    await userEvent.click(within(carlaRow).getByRole('button', { name: 'Quitar del espacio' }))
    expect(removeMember).not.toHaveBeenCalled()
    await userEvent.click(within(carlaRow).getByRole('button', { name: 'Confirmar' }))
    expect(removeMember).toHaveBeenCalledExactlyOnceWith(ORG, 'u-carla')
  })

  it('ADMIN: no role changes, cannot touch the OWNER, removes only plain members', async () => {
    setup({ ...adminOrganization, id: ORG }, [
      { ...ana, usuarioId: 'u-owner', nombre: 'Olga' },
      { ...bruno, usuarioId: therapist.id, nombre: 'Ana' },
      carla,
    ])
    renderApp(url)

    expect(screen.queryByLabelText(/Rol de gestión de/)).not.toBeInTheDocument()
    const owner = await rowOf('Olga')
    expect(within(owner).queryByRole('button')).not.toBeInTheDocument()
    const carlaRow = await rowOf('Carla')
    expect(within(carlaRow).getByRole('button', { name: 'Habilitar como terapeuta' })).toBeInTheDocument()
    expect(within(carlaRow).getByRole('button', { name: 'Quitar del espacio' })).toBeInTheDocument()
    // Leaving is always possible for a non-OWNER.
    expect(within(await rowOf('Ana')).getByRole('button', { name: 'Salir del espacio' })).toBeInTheDocument()
  })

  it('MIEMBRO: sees the team but no administration, and no pending invitations are requested', async () => {
    setup({ ...ownerOrganization, miRolGestion: 'MIEMBRO', miEsTerapeuta: true }, [
      { ...ana, usuarioId: 'u-owner', nombre: 'Olga' },
      { ...carla, usuarioId: therapist.id, nombre: 'Ana', esTerapeuta: true },
    ])
    renderApp(url)
    await rowOf('Olga')
    expect(screen.queryByRole('button', { name: 'Invitar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /terapeuta|Quitar del espacio/ })).not.toBeInTheDocument()
    expect(fetchOrganizationInvitations).not.toHaveBeenCalled()
  })

  it('turning off the therapist role asks for confirmation and refreshes members and patients', async () => {
    setup(ownerOrganization)
    vi.mocked(changeMemberTherapist).mockResolvedValue({ ...bruno, esTerapeuta: false })
    renderApp(url)
    const brunoRow = await rowOf('Bruno')
    await userEvent.click(within(brunoRow).getByRole('button', { name: 'Quitar rol de terapeuta' }))
    expect(within(brunoRow).getByText('Dejará de estar asignado a los pacientes de este espacio.')).toBeInTheDocument()
    await userEvent.click(within(brunoRow).getByRole('button', { name: 'Confirmar' }))

    expect(changeMemberTherapist).toHaveBeenCalledExactlyOnceWith(ORG, 'u-bruno', false)
    await vi.waitFor(() => expect(fetchMembers).toHaveBeenCalledTimes(2))
    // Capabilities per patient may have changed: patients and the own memberships are refetched.
    await vi.waitFor(() => expect(fetchOrganizations).toHaveBeenCalledTimes(2))
  })

  it.each([
    [403, 'No tienes permiso para hacer este cambio en el espacio.'],
    [404, 'Esa persona ya no pertenece al espacio, o ya no tienes acceso a él.'],
    [409, 'El propietario debe transferir la propiedad antes de salir o ser quitado del espacio.'],
  ])('shows the backend refusal %i on the member row', async (status, message) => {
    setup(ownerOrganization)
    vi.mocked(removeMember).mockRejectedValue(httpError(status))
    renderApp(url)
    const carlaRow = await rowOf('Carla')
    await userEvent.click(within(carlaRow).getByRole('button', { name: 'Quitar del espacio' }))
    await userEvent.click(within(carlaRow).getByRole('button', { name: 'Confirmar' }))
    expect(await within(carlaRow).findByRole('alert')).toHaveTextContent(message)
  })

  it('a refusal after being demoted elsewhere refreshes the role and hides the stale actions', async () => {
    setup(ownerOrganization)
    vi.mocked(removeMember).mockRejectedValue(httpError(403))
    renderApp(url)
    const carlaRow = await rowOf('Carla')
    await userEvent.click(within(carlaRow).getByRole('button', { name: 'Quitar del espacio' }))
    // Meanwhile the OWNER role was lost: the refetch reports a plain member.
    vi.mocked(fetchOrganizations).mockResolvedValue([{ ...ownerOrganization, miRolGestion: 'MIEMBRO' }])
    await userEvent.click(within(carlaRow).getByRole('button', { name: 'Confirmar' }))

    await vi.waitFor(() => expect(screen.queryByRole('button', { name: 'Quitar del espacio' })).not.toBeInTheDocument())
    expect(screen.queryByLabelText(/Rol de gestión de/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Invitar' })).not.toBeInTheDocument()
  })

  it('a refusal because the membership is gone ends on the no-access state', async () => {
    setup(ownerOrganization)
    vi.mocked(changeMemberRole).mockRejectedValue(httpError(404))
    renderApp(url)
    const carlaRow = await rowOf('Carla')
    vi.mocked(fetchOrganizations).mockResolvedValue([])
    await userEvent.selectOptions(within(carlaRow).getByLabelText('Rol de gestión de Carla'), 'ADMIN')
    expect(await screen.findByText('No tenés acceso a este espacio.')).toBeInTheDocument()
  })

  it('leaving the space goes back to the dashboard', async () => {
    setup({ ...adminOrganization, id: ORG }, [
      { ...ana, usuarioId: 'u-owner', nombre: 'Olga' },
      { ...bruno, usuarioId: therapist.id, nombre: 'Ana' },
    ])
    vi.mocked(removeMember).mockResolvedValue(undefined)
    renderApp(url)
    const anaRow = await rowOf('Ana')
    await userEvent.click(within(anaRow).getByRole('button', { name: 'Salir del espacio' }))
    await userEvent.click(within(anaRow).getByRole('button', { name: 'Confirmar' }))
    expect(removeMember).toHaveBeenCalledExactlyOnceWith(ORG, therapist.id)
    await vi.waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/))
  })

  describe('organization invitations', () => {
    it('OWNER invites with ADMIN or MIEMBRO, and the invited person stays pending, not a member', async () => {
      setup(ownerOrganization)
      vi.mocked(fetchOrganizationInvitations).mockResolvedValueOnce([]).mockResolvedValue([pendingInvitation])
      vi.mocked(inviteToOrganization).mockResolvedValue(pendingInvitation)
      renderApp(url)

      await userEvent.click(await screen.findByRole('button', { name: 'Invitar' }))
      const roles = within(screen.getByLabelText('Rol de gestión')).getAllByRole('option')
      expect(roles.map((option) => option.textContent)).toEqual(['Miembro', 'Administrador'])
      await userEvent.type(screen.getByLabelText('Email'), 'dani@example.com')
      await userEvent.click(screen.getByRole('button', { name: 'Enviar invitación' }))

      expect(inviteToOrganization).toHaveBeenCalledExactlyOnceWith(ORG, {
        email: 'dani@example.com',
        rolGestion: 'MIEMBRO',
        esTerapeuta: true,
      })
      expect(await screen.findByRole('status')).toHaveTextContent('Invitación enviada a dani@example.com.')
      const pending = await screen.findByRole('list', { name: 'Invitaciones pendientes' })
      expect(within(pending).getByText('Invitación pendiente · Miembro · Terapeuta')).toBeInTheDocument()
      expect(within(screen.getByRole('list', { name: 'Miembros del espacio' })).queryByText('dani@example.com')).not.toBeInTheDocument()
      expect(fetchMembers).toHaveBeenCalledOnce()
    })

    it('refetches members and pending invitations when the window regains focus (an invitee accepted)', async () => {
      setup(ownerOrganization)
      vi.mocked(fetchOrganizationInvitations).mockResolvedValue([pendingInvitation])
      renderApp(url)
      await screen.findByRole('list', { name: 'Invitaciones pendientes' })

      vi.mocked(fetchOrganizationInvitations).mockResolvedValue([])
      vi.mocked(fetchMembers).mockResolvedValue([ana, bruno, carla, member({ usuarioId: 'u-dani', nombre: 'Dani', email: 'dani@example.com' })])
      act(() => {
        focusManager.setFocused(false)
        focusManager.setFocused(true)
      })

      await vi.waitFor(() => expect(screen.getByText('Dani', { selector: 'span.font-medium' })).toBeInTheDocument())
      await vi.waitFor(() => expect(screen.queryByRole('list', { name: 'Invitaciones pendientes' })).not.toBeInTheDocument())
      act(() => focusManager.setFocused(undefined))
    })

    it('a 409 on resend (already a member) refreshes members and invitations', async () => {
      setup(ownerOrganization)
      vi.mocked(fetchOrganizationInvitations).mockResolvedValue([pendingInvitation])
      vi.mocked(inviteToOrganization).mockRejectedValue(httpError(409))
      renderApp(url)
      await userEvent.click(await screen.findByRole('button', { name: 'Reenviar invitación a dani@example.com' }))

      vi.mocked(fetchOrganizationInvitations).mockResolvedValue([])
      expect(await screen.findByRole('alert')).toHaveTextContent('Esa persona ya es miembro del espacio.')
      await vi.waitFor(() => expect(fetchMembers).toHaveBeenCalledTimes(2))
      await vi.waitFor(() => expect(fetchOrganizationInvitations).toHaveBeenCalledTimes(2))
    })

    it('shows the backend validation message on a 400', async () => {
      setup(ownerOrganization)
      vi.mocked(inviteToOrganization).mockRejectedValue(httpError(400, 'El email no es válido'))
      renderApp(url)
      await userEvent.click(await screen.findByRole('button', { name: 'Invitar' }))
      await userEvent.type(screen.getByLabelText('Email'), 'dani@example.com')
      await userEvent.click(screen.getByRole('button', { name: 'Enviar invitación' }))
      expect(await screen.findByRole('alert')).toHaveTextContent('El servidor rechazó los datos: El email no es válido')
    })

    it('ADMIN can only propose MIEMBRO', async () => {
      setup({ ...adminOrganization, id: ORG })
      renderApp(url)
      await userEvent.click(await screen.findByRole('button', { name: 'Invitar' }))
      const roles = within(screen.getByLabelText('Rol de gestión')).getAllByRole('option')
      expect(roles.map((option) => option.textContent)).toEqual(['Miembro'])
    })

    it('resends by repeating the POST with what the invitation proposes, and revokes', async () => {
      setup(ownerOrganization)
      vi.mocked(fetchOrganizationInvitations).mockResolvedValue([pendingInvitation])
      vi.mocked(inviteToOrganization).mockResolvedValue(pendingInvitation)
      vi.mocked(revokeOrganizationInvitation).mockResolvedValue(undefined)
      renderApp(url)

      await userEvent.click(await screen.findByRole('button', { name: 'Reenviar invitación a dani@example.com' }))
      expect(inviteToOrganization).toHaveBeenCalledExactlyOnceWith(ORG, {
        email: 'dani@example.com',
        rolGestion: 'MIEMBRO',
        esTerapeuta: true,
      })
      await screen.findByText('Invitación reenviada a dani@example.com.')

      await userEvent.click(await screen.findByRole('button', { name: 'Revocar invitación a dani@example.com' }))
      expect(revokeOrganizationInvitation).toHaveBeenCalledExactlyOnceWith(ORG, 'inv-dani')
    })

    it.each([
      [409, 'Esa persona ya es miembro del espacio.'],
      [403, 'No tienes permiso para invitar con ese rol.'],
    ])('keeps the form open on %i', async (status, message) => {
      setup(ownerOrganization)
      vi.mocked(inviteToOrganization).mockRejectedValue(httpError(status))
      renderApp(url)
      await userEvent.click(await screen.findByRole('button', { name: 'Invitar' }))
      await userEvent.type(screen.getByLabelText('Email'), 'carla@example.com')
      await userEvent.click(screen.getByRole('button', { name: 'Enviar invitación' }))
      expect(await screen.findByRole('alert')).toHaveTextContent(message)
      expect(screen.getByLabelText('Email')).toHaveValue('carla@example.com')
    })
  })

  it('a self-leave failure keeps the user on the page with the error', async () => {
    setup({ ...adminOrganization, id: ORG }, [
      { ...ana, usuarioId: 'u-owner', nombre: 'Olga' },
      { ...bruno, usuarioId: therapist.id, nombre: 'Ana' },
    ])
    vi.mocked(removeMember).mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'))
    renderApp(url)
    const anaRow = await rowOf('Ana')
    await userEvent.click(within(anaRow).getByRole('button', { name: 'Salir del espacio' }))
    await userEvent.click(within(anaRow).getByRole('button', { name: 'Confirmar' }))
    expect(await within(anaRow).findByRole('alert')).toHaveTextContent('No se pudo conectar con el servidor.')
    expect(screen.getByTestId('location')).toHaveTextContent(url)
  })

  it('a load error of the memberships offers a retry instead of claiming there is no access', async () => {
    vi.mocked(fetchOrganizations).mockRejectedValueOnce(httpError(500)).mockResolvedValue([ownerOrganization])
    vi.mocked(fetchMembers).mockResolvedValue([ana])
    renderApp(url)
    expect(await screen.findByRole('alert')).toHaveTextContent('Ocurrió un error inesperado.')
    expect(screen.queryByText('No tenés acceso a este espacio.')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await rowOf('Ana')).toBeInTheDocument()
  })

  it('does not open a space the user no longer belongs to', async () => {
    vi.mocked(fetchOrganizations).mockResolvedValue([])
    renderApp(url)
    expect(await screen.findByText('No tenés acceso a este espacio.')).toBeInTheDocument()
    expect(fetchMembers).not.toHaveBeenCalled()
  })
})
