import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchCurrentUser } from '@/features/auth/authApi'
import { fetchPatients } from '@/features/patients/patientsApi'
import { familyPatientsResponse, therapist, therapistPatientsResponse } from '@/features/patients/testing/fixtures'
import { renderApp } from '@/test/renderApp'
import { createOrganization, fetchOrganizations } from '../organizationsApi'
import { adminOrganization, ownerOrganization, plainMemberOrganization } from '../testing/fixtures'

vi.mock('@/features/auth/authApi')
vi.mock('@/features/patients/patientsApi')
vi.mock('../organizationsApi')

const location = () => screen.getByTestId('location')

describe('SpacesSection (dashboard onboarding)', () => {
  beforeEach(() => {
    vi.mocked(fetchCurrentUser).mockReset().mockResolvedValue(therapist)
    vi.mocked(fetchPatients).mockReset().mockResolvedValue([])
    vi.mocked(fetchOrganizations).mockReset().mockResolvedValue([])
    vi.mocked(createOrganization).mockReset()
  })

  it('offers creating a workspace when there is nothing yet, without creating it nor redirecting', async () => {
    renderApp('/')
    expect(await screen.findByRole('heading', { name: 'Creá tu espacio de trabajo' })).toBeInTheDocument()
    expect(screen.getByText(/abrí el enlace de la invitación/)).toBeInTheDocument()
    expect(createOrganization).not.toHaveBeenCalled()
    expect(location()).toHaveTextContent(/^\/$/)
  })

  it('creates the workspace with its name only, refreshes the memberships and enters it', async () => {
    const created = { id: 'org-new', nombre: 'Centro Sol', miRolGestion: 'OWNER' as const, miEsTerapeuta: true }
    vi.mocked(createOrganization).mockResolvedValue(created)
    renderApp('/')

    await userEvent.type(await screen.findByLabelText('Nombre del espacio'), '  Centro Sol ')
    vi.mocked(fetchOrganizations).mockResolvedValue([created])
    await userEvent.click(screen.getByRole('button', { name: 'Crear espacio' }))

    // No roles nor flags: the backend decides OWNER and esTerapeuta.
    expect(createOrganization).toHaveBeenCalledExactlyOnceWith({ nombre: 'Centro Sol' })
    expect(await screen.findByText('Centro Sol', { selector: 'p' })).toBeInTheDocument()
    expect(location()).toHaveTextContent('/pacientes')
    expect(fetchOrganizations).toHaveBeenCalledTimes(2)
  })

  it('validates the name before calling the server', async () => {
    renderApp('/')
    await userEvent.click(await screen.findByRole('button', { name: 'Crear espacio' }))
    expect(await screen.findByText('Ingresá el nombre del espacio.')).toBeInTheDocument()
    expect(createOrganization).not.toHaveBeenCalled()
  })

  it('with one organization shows a single entry with its role, keeping the option to add another', async () => {
    vi.mocked(fetchOrganizations).mockResolvedValue([ownerOrganization])
    vi.mocked(fetchPatients).mockResolvedValue(therapistPatientsResponse)
    renderApp('/')
    const section = await screen.findByRole('region', { name: 'Tus espacios' })
    const entry = within(section).getByRole('link', { name: /^Centro Sol/ })
    expect(entry).toHaveAttribute('href', '/pacientes?espacio=org-1')
    expect(entry).toHaveTextContent('Propietario · Terapeuta')
    expect(within(section).getByRole('button', { name: 'Nuevo espacio' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Creá tu espacio de trabajo' })).not.toBeInTheDocument()
    expect(location()).toHaveTextContent(/^\/$/)
  })

  it('with several organizations lets the user choose, each with its management role', async () => {
    vi.mocked(fetchOrganizations).mockResolvedValue([ownerOrganization, adminOrganization, plainMemberOrganization])
    renderApp('/')
    const section = await screen.findByRole('region', { name: 'Tus espacios' })
    const links = within(section).getAllByRole('link').filter((link) => !link.getAttribute('href')?.startsWith('/espacios/'))
    expect(within(section).getByRole('link', { name: 'Miembros de Centro Sol' })).toHaveAttribute('href', '/espacios/org-1/miembros')
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/pacientes?espacio=org-1',
      '/pacientes?espacio=org-2',
      '/pacientes?espacio=org-3',
    ])
    expect(within(section).getByText('Administrador')).toBeInTheDocument()
    expect(within(section).getByText('Miembro')).toBeInTheDocument()
  })

  it('takes a family-only user to the shared patients, without asking for an organization', async () => {
    vi.mocked(fetchPatients).mockResolvedValue(familyPatientsResponse)
    renderApp('/')
    const section = await screen.findByRole('region', { name: 'Tus espacios' })
    const shared = within(section).getByRole('link', { name: /Pacientes compartidos/ })
    expect(shared).toHaveAttribute('href', '/pacientes?espacio=compartidos')
    expect(shared).toHaveTextContent('2 pacientes como familiar')
    expect(screen.queryByRole('heading', { name: 'Creá tu espacio de trabajo' })).not.toBeInTheDocument()
  })

  it('keeps both contexts for a member who is also family', async () => {
    vi.mocked(fetchOrganizations).mockResolvedValue([ownerOrganization])
    vi.mocked(fetchPatients).mockResolvedValue([...therapistPatientsResponse, ...familyPatientsResponse])
    renderApp('/')
    const section = await screen.findByRole('region', { name: 'Tus espacios' })
    expect(within(section).getByRole('link', { name: /^Centro Sol/ })).toBeInTheDocument()
    expect(within(section).getByRole('link', { name: /Pacientes compartidos/ })).toBeInTheDocument()
  })

  it('offers a retry when the memberships cannot be loaded', async () => {
    vi.mocked(fetchOrganizations).mockRejectedValueOnce(new Error('500')).mockResolvedValue([ownerOrganization])
    renderApp('/')
    expect(await screen.findByText('No se pudieron cargar tus espacios.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('link', { name: /^Centro Sol/ })).toBeInTheDocument()
  })
})
