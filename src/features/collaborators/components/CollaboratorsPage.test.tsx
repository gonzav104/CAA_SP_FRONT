import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchCurrentUser } from '@/features/auth/authApi'
import { fetchBoards } from '@/features/boards/boardsApi'
import { boardsListResponse } from '@/features/boards/testing/fixtures'
import { fetchPatient } from '@/features/patients/patientsApi'
import { therapist, therapistPatientsResponse } from '@/features/patients/testing/fixtures'
import { renderApp } from '@/test/renderApp'
import { fetchCollaborators, linkCollaborator, revokeCollaborator, updateCollaboratorPermission } from '../collaboratorsApi'
import { collaboratorsListResponse, PATIENT_ID } from '../testing/fixtures'

vi.mock('@/features/auth/authApi')
vi.mock('@/features/patients/patientsApi')
vi.mock('@/features/boards/boardsApi')
vi.mock('../collaboratorsApi')

function http409(): AxiosError {
  const config = { headers: {} } as InternalAxiosRequestConfig
  return new AxiosError('failed', 'ERR_BAD_REQUEST', config, null, {
    status: 409,
    statusText: '',
    headers: {},
    config,
    data: {},
  })
}

const url = `/pacientes/${PATIENT_ID}/familia`

describe('CollaboratorsPage', () => {
  beforeEach(() => {
    vi.mocked(fetchCurrentUser).mockReset().mockResolvedValue(therapist)
    vi.mocked(fetchPatient).mockReset().mockResolvedValue(therapistPatientsResponse[0])
    vi.mocked(fetchBoards).mockReset().mockResolvedValue(boardsListResponse)
    vi.mocked(fetchCollaborators).mockReset().mockResolvedValue(collaboratorsListResponse)
    vi.mocked(linkCollaborator).mockReset()
    vi.mocked(updateCollaboratorPermission).mockReset()
    vi.mocked(revokeCollaborator).mockReset()
  })

  it('shows the section title and the primary action together in the content header', async () => {
    renderApp(url)
    await screen.findByRole('heading', { name: 'Familia' })
    expect(screen.getByRole('button', { name: 'Vincular familiar' })).toBeInTheDocument()
  })

  it('lists collaborators with their real identity and permission', async () => {
    renderApp(url)
    expect(await screen.findByText('Leo Gómez')).toBeInTheDocument()
    expect(screen.getByText('Rosa Gómez')).toBeInTheDocument()
    expect(screen.getByText('leo@example.com')).toBeInTheDocument()
  })

  it('shows an empty state when there are no collaborators', async () => {
    vi.mocked(fetchCollaborators).mockResolvedValue([])
    renderApp(url)
    expect(await screen.findByText('Todavía no hay familiares vinculados a este paciente.')).toBeInTheDocument()
  })

  it('links a collaborator with the real contract', async () => {
    vi.mocked(fetchCollaborators).mockResolvedValueOnce([]).mockResolvedValue(collaboratorsListResponse)
    vi.mocked(linkCollaborator).mockResolvedValue(collaboratorsListResponse[0])
    renderApp(url)
    await screen.findByText('Todavía no hay familiares vinculados a este paciente.')

    await userEvent.click(screen.getByRole('button', { name: 'Vincular familiar' }))
    await userEvent.type(screen.getByLabelText('Email del familiar'), 'rosa@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Vincular familiar' }))

    expect(linkCollaborator).toHaveBeenCalledWith(PATIENT_ID, { email: 'rosa@example.com', permiso: 'LECTURA' })
    expect(await screen.findByText('Leo Gómez')).toBeInTheDocument()
  })

  it('shows a conflict message when the collaborator is already linked', async () => {
    vi.mocked(linkCollaborator).mockRejectedValue(http409())
    renderApp(url)
    await screen.findByText('Leo Gómez')
    await userEvent.click(screen.getByRole('button', { name: 'Vincular familiar' }))
    await userEvent.type(screen.getByLabelText('Email del familiar'), 'leo@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Vincular familiar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Ese colaborador ya está vinculado a este paciente.')
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

  it('opens the link form directly when the workspace nav shortcut is used', async () => {
    renderApp(`${url}?crear=1`)
    expect(await screen.findByLabelText('Email del familiar')).toBeInTheDocument()
  })
})
