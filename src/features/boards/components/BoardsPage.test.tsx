import { screen, within } from '@testing-library/react'
import { AxiosError } from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchCurrentUser } from '@/features/auth/authApi'
import { fetchPatient } from '@/features/patients/patientsApi'
import { familyMember, therapist, therapistPatientsResponse } from '@/features/patients/testing/fixtures'
import type { Capability } from '@/features/patients/apiTypes'
import { renderApp } from '@/test/renderApp'
import { fetchBoards } from '../boardsApi'
import { boardsListResponse, PATIENT_ID } from '../testing/fixtures'

vi.mock('@/features/auth/authApi')
vi.mock('@/features/patients/patientsApi')
vi.mock('../boardsApi')

function http404(): AxiosError {
  const config = { headers: {} } as InternalAxiosRequestConfig
  return new AxiosError('failed', 'ERR_BAD_REQUEST', config, null, {
    status: 404,
    statusText: '',
    headers: {},
    config,
    data: {},
  })
}

const url = `/pacientes/${PATIENT_ID}/cartillas`

describe('BoardsPage', () => {
  beforeEach(() => {
    vi.mocked(fetchCurrentUser).mockReset().mockResolvedValue(therapist)
    vi.mocked(fetchPatient).mockReset().mockResolvedValue(therapistPatientsResponse[0])
    vi.mocked(fetchBoards).mockReset().mockResolvedValue(boardsListResponse)
  })

  it('shows the section title and the primary action together in the content header', async () => {
    renderApp(url)
    await screen.findByRole('heading', { name: 'Cartillas' })
    expect(screen.getByRole('button', { name: 'Nueva cartilla' })).toBeInTheDocument()
  })

  it('lists boards with the principal first and badged', async () => {
    renderApp(url)
    expect(await screen.findByRole('heading', { name: 'Tomás Pérez' })).toBeInTheDocument()
    const rows = await screen.findAllByRole('listitem')
    expect(rows.map((r) => r.querySelector('span[title]')?.textContent)).toEqual(['Principal', 'Casa', 'Paseo', 'Escuela'])
    expect(within(rows[0]).getByText('Principal', { selector: 'span.rounded-full' })).toBeInTheDocument()
    expect(within(rows[2]).queryByText('Principal', { selector: 'span.rounded-full' })).not.toBeInTheDocument()
  })

  it('shows Editar on every cartilla when the patient is editable, whoever created it', async () => {
    renderApp(url)
    const rows = await screen.findAllByRole('listitem')
    const escuela = rows[3]
    expect(within(escuela).getByRole('link', { name: 'Editar' })).toHaveAttribute('href', `${url}/c-3/editor`)
    expect(within(escuela).queryByText('Solo lectura')).not.toBeInTheDocument()
    expect(within(escuela).getByRole('link', { name: 'Modo Uso' })).toHaveAttribute('href', `${url}/c-3/uso`)
    expect(within(rows[0]).getByRole('link', { name: 'Editar' })).toHaveAttribute('href', `${url}/c-1/editor`)
    expect(within(rows[0]).queryByText('Solo lectura')).not.toBeInTheDocument()
  })

  it('links back to the patients list', async () => {
    renderApp(url)
    expect(await screen.findByRole('link', { name: 'Volver a pacientes' })).toHaveAttribute('href', '/pacientes')
  })

  it('shows the patient identity and age in the header, and a direct way into the principal board', async () => {
    renderApp(url)
    await screen.findByRole('heading', { name: 'Tomás Pérez' })
    expect(screen.getByText(/años? · Nacimiento: 12\/05\/2018/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Abrir Modo Uso' })).toHaveAttribute('href', `${url}/c-1/uso`)
  })

  it('has no "Abrir Modo Uso" shortcut when the patient has no principal board', async () => {
    vi.mocked(fetchBoards).mockResolvedValue(boardsListResponse.map((board) => ({ ...board, esPrincipal: false })))
    renderApp(url)
    await screen.findByRole('heading', { name: 'Tomás Pérez' })
    expect(screen.queryByRole('link', { name: 'Abrir Modo Uso' })).not.toBeInTheDocument()
  })

  it('shows the empty state with a create button for the responsible therapist', async () => {
    vi.mocked(fetchBoards).mockResolvedValue([])
    renderApp(url)
    expect(await screen.findByText('Este paciente todavía no tiene cartillas.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Crear la primera cartilla' })).toBeInTheDocument()
  })

  it('shows the empty state without a create button for a read-only familiar', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(familyMember)
    vi.mocked(fetchPatient).mockResolvedValue({ ...therapistPatientsResponse[0], miPermiso: 'LECTURA', capacidades: [] })
    vi.mocked(fetchBoards).mockResolvedValue([])
    renderApp(url)
    expect(await screen.findByText('Este paciente todavía no tiene cartillas.')).toBeInTheDocument()
    expect(screen.queryByText(/Nueva cartilla/)).not.toBeInTheDocument()
  })

  it('shows a boards error with retry', async () => {
    vi.mocked(fetchBoards).mockRejectedValue(new Error('500'))
    renderApp(url)
    expect(await screen.findByRole('alert')).toHaveTextContent('Ocurrió un error inesperado.')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('shows the patient not-found copy on 404', async () => {
    vi.mocked(fetchPatient).mockRejectedValue(http404())
    vi.mocked(fetchBoards).mockReturnValue(new Promise(() => {}))
    renderApp(url)
    expect(await screen.findByRole('alert')).toHaveTextContent('No encontramos al paciente o no tenés acceso.')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    // No patient identity is known yet: the contextual header and the "Cartillas" section stay out, not a fake fallback.
    expect(screen.queryByRole('heading', { name: 'Cartillas' })).not.toBeInTheDocument()
  })

  it('opens the create form directly when the workspace nav shortcut is used', async () => {
    renderApp(`${url}?crear=1`)
    expect(await screen.findByLabelText('Nombre de la nueva cartilla')).toBeInTheDocument()
  })

  it('says when each cartilla was created, and opens its Editor and Modo Uso', async () => {
    renderApp(url)
    const rows = await screen.findAllByRole('listitem')
    const row = rows.find((candidate) => candidate.textContent?.includes('Escuela'))!
    expect(row).toHaveTextContent('Creada el 01/03/2026')
    expect(within(row).getByRole('link', { name: 'Editar' })).toHaveAttribute('href', `/pacientes/${PATIENT_ID}/cartillas/c-3/editor`)
    expect(within(row).getByRole('link', { name: 'Modo Uso' })).toHaveAttribute('href', `/pacientes/${PATIENT_ID}/cartillas/c-3/uso`)
  })

  it('announces the loading state', async () => {
    vi.mocked(fetchBoards).mockReturnValue(new Promise(() => {}))
    renderApp(url)
    expect(await screen.findByText('Cargando cartillas…')).toHaveAttribute('role', 'status')
  })

  it.each([
    ['therapist', ['EDITAR_CONTENIDO', 'GESTION_CLINICA'] as Capability[], true, true],
    ['EDICION_LIMITADA', ['EDITAR_CONTENIDO'] as Capability[], true, false],
    ['LECTURA', [] as Capability[], false, false],
  ])('shows %s only the actions its capabilities allow', async (_label, capacidades, edits, clinical) => {
    vi.mocked(fetchPatient).mockResolvedValue({ ...therapistPatientsResponse[0], capacidades })
    renderApp(url)
    const rows = await screen.findAllByRole('listitem')
    const row = within(rows[rows.length - 1])
    expect(row.queryAllByRole('link', { name: 'Editar' })).toHaveLength(edits ? 1 : 0)
    expect(row.queryAllByRole('button', { name: /^Renombrar/ })).toHaveLength(edits ? 1 : 0)
    expect(row.queryAllByRole('button', { name: /^Eliminar/ })).toHaveLength(clinical ? 1 : 0)
    expect(row.queryAllByRole('button', { name: /como principal$/ })).toHaveLength(clinical ? 1 : 0)
    expect(row.getByRole('link', { name: 'Modo Uso' })).toBeInTheDocument()
  })

  it('gives no creation action to whoever cannot create, even with an empty list', async () => {
    vi.mocked(fetchPatient).mockResolvedValue({ ...therapistPatientsResponse[0], capacidades: [] })
    vi.mocked(fetchBoards).mockResolvedValue([])
    renderApp(url)
    expect(await screen.findByText('Este paciente todavía no tiene cartillas.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /cartilla/ })).not.toBeInTheDocument()
  })
})
