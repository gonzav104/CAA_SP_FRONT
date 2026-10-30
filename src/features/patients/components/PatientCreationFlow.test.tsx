import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchCurrentUser } from '@/features/auth/authApi'
import { fetchBoards } from '@/features/boards/boardsApi'
import { fetchOrganizations } from '@/features/organizations/organizationsApi'
import type { OrganizacionResponse } from '@/features/organizations/apiTypes'
import { adminOrganization, ownerOrganization, plainMemberOrganization } from '@/features/organizations/testing/fixtures'
import { renderApp } from '@/test/renderApp'
import type { Capability, PacienteResponse } from '../apiTypes'
import { createPatient, fetchPatient, fetchPatients } from '../patientsApi'
import { familyPatientsResponse, therapist, therapistPatientsResponse } from '../testing/fixtures'

vi.mock('@/features/auth/authApi')
vi.mock('@/features/boards/boardsApi')
vi.mock('@/features/organizations/organizationsApi')
vi.mock('../patientsApi')

function created(capacidades: Capability[]): PacienteResponse {
  return {
    id: 'p-new',
    nombre: 'Noa',
    apellido: 'Díaz',
    fechaNacimiento: '2019-01-01',
    creadoEn: '2026-01-01T00:00:00',
    miPermiso: null,
    gridSize: null,
    organizacionId: ownerOrganization.id,
    capacidades,
  }
}

function setup(organizations: OrganizacionResponse[], patients: PacienteResponse[] = []) {
  vi.mocked(fetchOrganizations).mockResolvedValue(organizations)
  vi.mocked(fetchPatients).mockResolvedValue(patients)
}

async function fillAndSubmit() {
  await userEvent.type(screen.getByLabelText('Nombre'), 'Noa')
  await userEvent.type(screen.getByLabelText('Apellido'), 'Díaz')
  await userEvent.type(screen.getByLabelText('Fecha de nacimiento'), '2019-01-01')
  await userEvent.click(screen.getByRole('button', { name: 'Crear paciente' }))
}

beforeEach(() => {
  vi.mocked(fetchCurrentUser).mockReset().mockResolvedValue(therapist)
  vi.mocked(fetchBoards).mockReset().mockResolvedValue([])
  vi.mocked(createPatient).mockReset()
})

describe('registering a patient', () => {
  it('shows a focused form, without the list, and says where it will be registered', async () => {
    setup([ownerOrganization], therapistPatientsResponse)
    renderApp('/pacientes?crear=1')
    expect(await screen.findByRole('form', { name: 'Nuevo paciente' })).toHaveTextContent(`Se registrará en ${ownerOrganization.nombre}`)
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Listado de pacientes' })).not.toBeInTheDocument()
  })

  it('cancelling leaves the list and the URL as if the form had never opened', async () => {
    setup([ownerOrganization], therapistPatientsResponse)
    renderApp('/pacientes?crear=1')
    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar' }))
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/pacientes$/)
    expect(await screen.findByRole('region', { name: 'Listado de pacientes' })).toBeInTheDocument()
  })

  it('validates a field when leaving it, not while typing, and links the error to it', async () => {
    setup([ownerOrganization])
    renderApp('/pacientes?crear=1')
    const nombre = await screen.findByLabelText('Nombre')
    await userEvent.type(nombre, ' ')
    expect(screen.queryByText('El nombre es obligatorio.')).not.toBeInTheDocument()
    await userEvent.tab()
    expect(await screen.findByText('El nombre es obligatorio.')).toHaveAttribute('id', nombre.getAttribute('aria-describedby'))
    expect(nombre).toHaveAttribute('aria-invalid', 'true')
  })

  it('refuses a birth date of today, as the backend @Past does', async () => {
    setup([ownerOrganization])
    renderApp('/pacientes?crear=1')
    const now = new Date()
    const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-')
    await userEvent.type(await screen.findByLabelText('Fecha de nacimiento'), today)
    await userEvent.tab()
    expect(await screen.findByText('La fecha de nacimiento debe ser en el pasado.')).toBeInTheDocument()
  })

  it('sends only once on a double click, and shows that it is saving', async () => {
    setup([ownerOrganization])
    vi.mocked(createPatient).mockReturnValue(new Promise(() => {}))
    renderApp('/pacientes?crear=1')
    await userEvent.type(await screen.findByLabelText('Nombre'), 'Noa')
    await userEvent.type(screen.getByLabelText('Apellido'), 'Díaz')
    await userEvent.type(screen.getByLabelText('Fecha de nacimiento'), '2019-01-01')
    await userEvent.dblClick(screen.getByRole('button', { name: 'Crear paciente' }))
    expect(await screen.findByRole('button', { name: 'Creando…' })).toBeDisabled()
    expect(createPatient).toHaveBeenCalledOnce()
  })

  it('never registers in an organization the user cannot create in', async () => {
    setup([ownerOrganization, plainMemberOrganization])
    renderApp('/pacientes?crear=1')
    await screen.findByRole('form', { name: 'Nuevo paciente' })
    expect(screen.queryByLabelText('Espacio')).not.toBeInTheDocument()
  })
})

describe('after registering', () => {
  it('confirms it and offers every step the capabilities allow, creating nothing', async () => {
    setup([ownerOrganization])
    vi.mocked(createPatient).mockResolvedValue(created(['EDITAR_CONTENIDO', 'GESTION_CLINICA', 'ADMINISTRAR']))
    renderApp('/pacientes?crear=1')
    await screen.findByLabelText('Nombre')
    await fillAndSubmit()

    const heading = await screen.findByRole('heading', { name: 'Noa Díaz ya está en tu espacio' })
    expect(heading).toHaveFocus()
    const panel = screen.getByRole('region', { name: 'Noa Díaz ya está en tu espacio' })
    const links = within(panel).getAllByRole('link')
    expect(links.map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['Crear cartilla', '/pacientes/p-new/cartillas?crear=1'],
      ['Asignar terapeuta', '/pacientes/p-new/equipo'],
      ['Invitar familiar', '/pacientes/p-new/familia?crear=1'],
      ['Registrar sesión', '/pacientes/p-new/sesiones/nueva'],
    ])
    expect(createPatient).toHaveBeenCalledOnce()
  })

  it('hides what the backend did not allow', async () => {
    setup([ownerOrganization])
    vi.mocked(createPatient).mockResolvedValue(created(['EDITAR_CONTENIDO']))
    renderApp('/pacientes?crear=1')
    await screen.findByLabelText('Nombre')
    await fillAndSubmit()
    const panel = await screen.findByRole('region', { name: 'Noa Díaz ya está en tu espacio' })
    expect(within(panel).getAllByRole('link').map((link) => link.textContent)).toEqual(['Crear cartilla'])
  })

  it('can be dismissed and stays in the patient workspace', async () => {
    setup([ownerOrganization])
    vi.mocked(createPatient).mockResolvedValue(created(['EDITAR_CONTENIDO']))
    renderApp('/pacientes?crear=1')
    await screen.findByLabelText('Nombre')
    await fillAndSubmit()
    await userEvent.click(await screen.findByRole('button', { name: 'Cerrar confirmación' }))
    expect(screen.queryByRole('region', { name: 'Noa Díaz ya está en tu espacio' })).not.toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/pacientes/p-new/cartillas')
  })
})

describe('the confirmation is one shot', () => {
  it('stays while moving between sections, and is gone when leaving the patient', async () => {
    setup([ownerOrganization])
    vi.mocked(createPatient).mockResolvedValue(created(['EDITAR_CONTENIDO', 'GESTION_CLINICA']))
    renderApp('/pacientes?crear=1')
    await screen.findByLabelText('Nombre')
    await fillAndSubmit()
    await screen.findByRole('heading', { name: 'Noa Díaz ya está en tu espacio' })

    const nav = screen.getByRole('navigation', { name: 'Secciones del paciente' })
    await userEvent.click(within(nav).getByRole('link', { name: 'Pictogramas' }))
    expect(screen.getByRole('heading', { name: 'Noa Díaz ya está en tu espacio' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('link', { name: 'Volver a pacientes' }))
    await screen.findByRole('heading', { level: 1, name: 'Pacientes' })
    expect(screen.queryByRole('heading', { name: 'Noa Díaz ya está en tu espacio' })).not.toBeInTheDocument()
  })

  it('is not shown when the workspace opens by URL', async () => {
    setup([ownerOrganization])
    vi.mocked(fetchPatient).mockResolvedValue(created(['EDITAR_CONTENIDO']))
    renderApp('/pacientes/p-new/cartillas')
    await screen.findByRole('heading', { level: 1, name: 'Noa Díaz' })
    expect(screen.queryByRole('heading', { name: 'Noa Díaz ya está en tu espacio' })).not.toBeInTheDocument()
  })
})

describe('list states', () => {
  const inOwnerSpace = therapistPatientsResponse.map((patient) => ({ ...patient, organizacionId: ownerOrganization.id }))

  it('says which space each patient belongs to in the mixed view', async () => {
    setup([ownerOrganization, adminOrganization], inOwnerSpace)
    renderApp('/pacientes')
    const list = await screen.findByRole('region', { name: 'Listado de pacientes' })
    expect(within(list).getAllByText(ownerOrganization.nombre)).toHaveLength(inOwnerSpace.length)
  })

  it('does not repeat the space when a single one is shown', async () => {
    setup([ownerOrganization, adminOrganization], inOwnerSpace)
    renderApp(`/pacientes?espacio=${ownerOrganization.id}`)
    const list = await screen.findByRole('region', { name: 'Listado de pacientes' })
    expect(within(list).queryByText(ownerOrganization.nombre)).not.toBeInTheDocument()
  })

  it('offers the first patient from the empty list', async () => {
    setup([ownerOrganization])
    renderApp('/pacientes')
    await userEvent.click(await screen.findByRole('button', { name: 'Registrar el primer paciente' }))
    expect(await screen.findByRole('form', { name: 'Nuevo paciente' })).toBeInTheDocument()
  })

  it('sends a user without spaces to create one, never to a form they cannot use', async () => {
    setup([])
    renderApp('/pacientes')
    expect(await screen.findByRole('link', { name: 'Crear un espacio desde el inicio' })).toHaveAttribute('href', '/')
    expect(screen.queryByRole('button', { name: /paciente/ })).not.toBeInTheDocument()
  })

  it('gives a family member no creation action', async () => {
    setup([], familyPatientsResponse)
    renderApp('/pacientes')
    await screen.findByRole('region', { name: 'Listado de pacientes' })
    expect(screen.queryByRole('button', { name: /paciente/i })).not.toBeInTheDocument()
  })

  it('recovers from no matches', async () => {
    setup([ownerOrganization], therapistPatientsResponse)
    renderApp('/pacientes')
    await userEvent.type(await screen.findByRole('searchbox'), 'zzz')
    await userEvent.click(await screen.findByRole('button', { name: 'Ver todos' }))
    expect(await screen.findByRole('region', { name: 'Listado de pacientes' })).toBeInTheDocument()
  })
})
