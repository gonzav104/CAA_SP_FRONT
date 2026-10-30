import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchCurrentUser } from '@/features/auth/authApi'
import type { CurrentUser } from '@/features/auth/types'
import { fetchOrganizations } from '@/features/organizations/organizationsApi'
import type { OrganizacionResponse } from '@/features/organizations/apiTypes'
import {
  adminOrganization,
  ownerOrganization,
  plainMemberOrganization,
  therapistMemberOrganization,
} from '@/features/organizations/testing/fixtures'
import { renderApp } from '@/test/renderApp'
import type { PacienteResponse } from '../apiTypes'
import { createPatient, fetchPatient, fetchPatients } from '../patientsApi'
import { familyMember, familyPatientsResponse, therapist, therapistPatientsResponse } from '../testing/fixtures'

vi.mock('@/features/auth/authApi')
vi.mock('@/features/organizations/organizationsApi')
vi.mock('../patientsApi')
vi.mock('@/features/boards/boardsApi')

const createdPatient: PacienteResponse = {
  id: 'p-new',
  nombre: 'Noa',
  apellido: 'Díaz',
  fechaNacimiento: '2019-01-01',
  creadoEn: '2026-01-01T00:00:00',
  miPermiso: null,
  gridSize: null,
  organizacionId: therapistMemberOrganization.id,
  capacidades: ['EDITAR_CONTENIDO', 'GESTION_CLINICA'],
}

function httpError(status: number, message?: string): AxiosError {
  const config = { headers: {} } as InternalAxiosRequestConfig
  return new AxiosError('failed', 'ERR_BAD_REQUEST', config, null, {
    status,
    statusText: '',
    headers: {},
    config,
    data: message ? { timestamp: '2026-01-01T00:00:00', status, error: 'Bad Request', message } : undefined,
  })
}

async function fillNewPatient() {
  await userEvent.type(screen.getByLabelText('Nombre'), 'Noa')
  await userEvent.type(screen.getByLabelText('Apellido'), 'Díaz')
  await userEvent.type(screen.getByLabelText('Fecha de nacimiento'), '2019-01-01')
}

function setup(user: CurrentUser, organizations: OrganizacionResponse[] = [therapistMemberOrganization]) {
  vi.mocked(fetchCurrentUser).mockResolvedValue(user)
  vi.mocked(fetchOrganizations).mockResolvedValue(organizations)
}

describe('PatientsPage', () => {
  beforeEach(() => {
    vi.mocked(fetchPatients).mockReset()
    vi.mocked(fetchCurrentUser).mockReset()
    vi.mocked(fetchOrganizations).mockReset()
    vi.mocked(createPatient).mockReset()
    vi.mocked(fetchPatient).mockReset()
  })

  it('shows a loading state', async () => {
    setup(therapist)
    vi.mocked(fetchPatients).mockReturnValue(new Promise(() => {}))
    renderApp('/pacientes')
    expect(await screen.findByText('Cargando pacientes…')).toHaveAttribute('role', 'status')
  })

  it('shows the therapist empty copy', async () => {
    setup(therapist)
    vi.mocked(fetchPatients).mockResolvedValue([])
    renderApp('/pacientes')
    expect(await screen.findByText('Todavía no tenés pacientes registrados.')).toBeInTheDocument()
  })

  it('shows the family empty copy', async () => {
    setup(familyMember, [])
    vi.mocked(fetchPatients).mockResolvedValue([])
    renderApp('/pacientes')
    expect(await screen.findByText('Todavía no tenés pacientes vinculados.')).toBeInTheDocument()
  })

  it('shows an error and retries', async () => {
    setup(therapist)
    vi.mocked(fetchPatients)
      .mockRejectedValueOnce(new AxiosError('Network Error', 'ERR_NETWORK'))
      .mockResolvedValue(therapistPatientsResponse)
    renderApp('/pacientes')
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo conectar con el servidor.')
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Bruno Álvarez')).toBeInTheDocument()
    expect(fetchPatients).toHaveBeenCalledTimes(2)
  })

  it('lists sorted patients as cards opening their boards, without badges for therapists', async () => {
    setup(therapist)
    vi.mocked(fetchPatients).mockResolvedValue(therapistPatientsResponse)
    renderApp('/pacientes')
    const links = await screen.findAllByRole('link', { name: /Abrir espacio de comunicación de/ })
    expect(links.map((l) => l.getAttribute('href'))).toEqual([
      '/pacientes/p-1/cartillas',
      '/pacientes/p-2/cartillas',
      '/pacientes/p-3/cartillas',
    ])
    expect(links[0]).toHaveTextContent('Bruno Álvarez')
    expect(links[0]).toHaveTextContent(/\d+ años?/)
    expect(screen.queryByText('Solo lectura')).not.toBeInTheDocument()
  })

  it('shows collaborator badges', async () => {
    setup(familyMember, [])
    vi.mocked(fetchPatients).mockResolvedValue(familyPatientsResponse)
    renderApp('/pacientes')
    expect(await screen.findByText('Solo lectura')).toBeInTheDocument()
    expect(screen.getByText('Edición limitada')).toBeInTheDocument()
  })

  it('shows the user name in the shell', async () => {
    setup(therapist)
    vi.mocked(fetchPatients).mockResolvedValue([])
    renderApp('/pacientes')
    expect(await screen.findByText('Ana')).toBeInTheDocument()
  })

  it('filters patients immediately as you type, case-insensitively', async () => {
    setup(therapist)
    vi.mocked(fetchPatients).mockResolvedValue(therapistPatientsResponse)
    renderApp('/pacientes')
    await screen.findByText('Bruno Álvarez')

    await userEvent.type(screen.getByRole('searchbox', { name: /Buscar paciente/ }), 'alma')

    expect(screen.getByText('Alma Pérez')).toBeInTheDocument()
    expect(screen.queryByText('Bruno Álvarez')).not.toBeInTheDocument()
  })

  it('shows a no-matches state', async () => {
    setup(therapist)
    vi.mocked(fetchPatients).mockResolvedValue(therapistPatientsResponse)
    renderApp('/pacientes')
    await userEvent.type(await screen.findByRole('searchbox', { name: /Buscar paciente/ }), 'zzz')
    expect(await screen.findByText('Ningún paciente coincide con «zzz».')).toBeInTheDocument()
  })

  it('offers "Nuevo paciente" to a therapist', async () => {
    setup(therapist)
    vi.mocked(fetchPatients).mockResolvedValue([])
    renderApp('/pacientes')
    expect(await screen.findByRole('button', { name: 'Nuevo paciente' })).toBeInTheDocument()
  })

  it('does not offer "Nuevo paciente" to a family collaborator', async () => {
    setup(familyMember, [])
    vi.mocked(fetchPatients).mockResolvedValue([])
    renderApp('/pacientes')
    await screen.findByText('Todavía no tenés pacientes vinculados.')
    expect(screen.queryByRole('button', { name: 'Nuevo paciente' })).not.toBeInTheDocument()
  })

  it('creates in the only enabled organization, keeps the returned capabilities and opens the new patient', async () => {
    setup(therapist, [therapistMemberOrganization, plainMemberOrganization])
    vi.mocked(fetchPatients).mockResolvedValueOnce([]).mockResolvedValue([createdPatient])
    vi.mocked(createPatient).mockResolvedValue(createdPatient)
    renderApp('/pacientes')

    await userEvent.click(await screen.findByRole('button', { name: 'Nuevo paciente' }))
    expect(screen.queryByLabelText('Organización')).not.toBeInTheDocument()
    await fillNewPatient()
    await userEvent.click(screen.getByRole('button', { name: 'Crear paciente' }))

    expect(createPatient).toHaveBeenCalledExactlyOnceWith(therapistMemberOrganization.id, {
      nombre: 'Noa',
      apellido: 'Díaz',
      fechaNacimiento: '2019-01-01',
    })
    expect(await screen.findByRole('heading', { name: 'Noa Díaz' })).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/pacientes/p-new/cartillas')
    // The detail comes from the POST response: its capabilities drive the sections without a refetch.
    expect(fetchPatient).not.toHaveBeenCalled()
    const nav = screen.getByRole('navigation', { name: 'Secciones del paciente' })
    expect(within(nav).getByRole('link', { name: 'Sesiones' })).toBeInTheDocument()

    // The directory was invalidated: coming back fetches it again and shows the new patient.
    await userEvent.click(screen.getByRole('link', { name: 'Volver a pacientes' }))
    expect(await screen.findByText('Noa Díaz')).toBeInTheDocument()
    expect(fetchPatients).toHaveBeenCalledTimes(2)
  })

  it('asks for the organization when several are enabled, and creates in the chosen one', async () => {
    setup(therapist, [ownerOrganization, adminOrganization])
    vi.mocked(fetchPatients).mockResolvedValue([])
    vi.mocked(createPatient).mockResolvedValue({ ...createdPatient, organizacionId: adminOrganization.id })
    renderApp('/pacientes')

    await userEvent.click(await screen.findByRole('button', { name: 'Nuevo paciente' }))
    await fillNewPatient()
    await userEvent.click(screen.getByRole('button', { name: 'Crear paciente' }))
    expect(await screen.findByText('Selecciona la organización.')).toBeInTheDocument()
    expect(createPatient).not.toHaveBeenCalled()

    await userEvent.selectOptions(screen.getByLabelText('Organización'), adminOrganization.nombre)
    await userEvent.click(screen.getByRole('button', { name: 'Crear paciente' }))

    expect(createPatient).toHaveBeenCalledExactlyOnceWith(adminOrganization.id, expect.objectContaining({ nombre: 'Noa' }))
    expect(await screen.findByRole('heading', { name: 'Noa Díaz' })).toBeInTheDocument()
  })

  it('offers only the organizations where the user may register patients', async () => {
    setup(therapist, [ownerOrganization, plainMemberOrganization, adminOrganization])
    vi.mocked(fetchPatients).mockResolvedValue([])
    renderApp('/pacientes')
    await userEvent.click(await screen.findByRole('button', { name: 'Nuevo paciente' }))
    const options = within(screen.getByLabelText('Organización')).getAllByRole('option')
    expect(options.map((option) => option.textContent)).toEqual([
      'Selecciona una organización',
      ownerOrganization.nombre,
      adminOrganization.nombre,
    ])
  })

  it('does not offer creation to a member who is neither OWNER/ADMIN nor therapist', async () => {
    setup(therapist, [plainMemberOrganization])
    vi.mocked(fetchPatients).mockResolvedValue([])
    renderApp('/pacientes')
    await screen.findByText('Todavía no tenés pacientes vinculados.')
    expect(screen.queryByRole('button', { name: 'Nuevo paciente' })).not.toBeInTheDocument()
  })

  it('explains why it cannot create when the shortcut lands without enabled organizations', async () => {
    setup(familyMember, [])
    vi.mocked(fetchPatients).mockResolvedValue([])
    renderApp('/pacientes?crear=1')
    expect(await screen.findByText(/No perteneces a ninguna organización donde puedas registrar pacientes/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Crear paciente' })).not.toBeInTheDocument()
    expect(createPatient).not.toHaveBeenCalled()
  })

  it('shows field validation without calling the server', async () => {
    setup(therapist)
    vi.mocked(fetchPatients).mockResolvedValue([])
    renderApp('/pacientes')
    await userEvent.click(await screen.findByRole('button', { name: 'Nuevo paciente' }))

    await userEvent.click(screen.getByRole('button', { name: 'Crear paciente' }))

    expect(await screen.findByText('El nombre es obligatorio.')).toBeInTheDocument()
    expect(screen.getByText('El apellido es obligatorio.')).toBeInTheDocument()
    expect(screen.getByText('La fecha de nacimiento es obligatoria.')).toBeInTheDocument()
    expect(createPatient).not.toHaveBeenCalled()
  })

  it.each([
    ['network', new AxiosError('Network Error', 'ERR_NETWORK'), 'No se pudo conectar con el servidor.'],
    ['400', httpError(400, 'La fecha de nacimiento debe ser en el pasado'), 'El servidor rechazó los datos: La fecha de nacimiento debe ser en el pasado'],
    ['401', httpError(401), 'Tu sesión expiró. Inicia sesión nuevamente.'],
    ['403', httpError(403), 'No tienes permiso para registrar pacientes en esta organización.'],
    ['409', httpError(409), 'No se pudo registrar el paciente por un conflicto con datos existentes.'],
    ['500', httpError(500), 'Ocurrió un error inesperado.'],
  ])('on a %s failure shows the error, keeps the typed values and does not navigate', async (_label, failure, message) => {
    setup(therapist)
    vi.mocked(fetchPatients).mockResolvedValue([])
    vi.mocked(createPatient).mockRejectedValue(failure)
    renderApp('/pacientes')
    await userEvent.click(await screen.findByRole('button', { name: 'Nuevo paciente' }))
    await fillNewPatient()

    await userEvent.click(screen.getByRole('button', { name: 'Crear paciente' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.getByLabelText('Nombre')).toHaveValue('Noa')
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/pacientes$/)
    expect(fetchPatients).toHaveBeenCalledOnce()
  })

  describe('spaces', () => {
    const mixed = [...therapistPatientsResponse, ...familyPatientsResponse]

    it('shows only the clinical-team patients of the active organization, and lets the user switch', async () => {
      setup(therapist, [ownerOrganization, adminOrganization])
      vi.mocked(fetchPatients).mockResolvedValue(mixed)
      renderApp('/pacientes?espacio=org-1')

      expect(await screen.findByText('Bruno Álvarez')).toBeInTheDocument()
      expect(screen.getByText('Centro Sol', { selector: 'p' })).toBeInTheDocument()
      expect(screen.queryByText('Lola Gómez')).not.toBeInTheDocument()

      await userEvent.selectOptions(screen.getByLabelText('Espacio'), 'Pacientes compartidos')
      expect(await screen.findByText('Lola Gómez')).toBeInTheDocument()
      expect(screen.queryByText('Bruno Álvarez')).not.toBeInTheDocument()

      await userEvent.selectOptions(screen.getByLabelText('Espacio'), 'Todos los espacios')
      expect(await screen.findByText('Bruno Álvarez')).toBeInTheDocument()
      expect(screen.getByText('Lola Gómez')).toBeInTheDocument()
    })

    it('never trusts a space the user no longer belongs to: notice and every patient', async () => {
      setup(therapist, [adminOrganization])
      vi.mocked(fetchPatients).mockResolvedValue(mixed)
      renderApp('/pacientes?espacio=org-1')
      expect(await screen.findByText('Ya no tenés acceso a ese espacio. Mostramos todos tus pacientes.')).toBeInTheDocument()
      expect(screen.getByText('Bruno Álvarez')).toBeInTheDocument()
      expect(screen.getByText('Lola Gómez')).toBeInTheDocument()
    })

    it('says so when the active organization has no patients yet', async () => {
      setup(therapist, [ownerOrganization, adminOrganization])
      vi.mocked(fetchPatients).mockResolvedValue(therapistPatientsResponse)
      renderApp('/pacientes?espacio=org-2')
      expect(await screen.findByText('Este espacio todavía no tiene pacientes.')).toBeInTheDocument()
    })

    it('preselects the active organization when registering a patient', async () => {
      setup(therapist, [ownerOrganization, adminOrganization])
      vi.mocked(fetchPatients).mockResolvedValue([])
      renderApp('/pacientes?espacio=org-2')
      await userEvent.click(await screen.findByRole('button', { name: 'Nuevo paciente' }))
      expect(screen.getByLabelText('Organización')).toHaveValue('org-2')
    })
  })
})
