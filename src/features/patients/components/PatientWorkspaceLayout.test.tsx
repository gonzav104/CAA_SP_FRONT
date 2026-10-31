import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchCurrentUser } from '@/features/auth/authApi'
import { fetchBoards } from '@/features/boards/boardsApi'
import { boardsListResponse } from '@/features/boards/testing/fixtures'
import { fetchOrganizations } from '@/features/organizations/organizationsApi'
import { ownerOrganization } from '@/features/organizations/testing/fixtures'
import { renderApp } from '@/test/renderApp'
import type { Capability } from '../apiTypes'
import { deletePatient, fetchPatient, updatePatient } from '../patientsApi'
import { familyMember, therapist, therapistPatientsResponse } from '../testing/fixtures'

vi.mock('@/features/auth/authApi')
vi.mock('@/features/boards/boardsApi')
vi.mock('@/features/organizations/organizationsApi')
vi.mock('../patientsApi')

const PATIENT_ID = therapistPatientsResponse[0].id
const url = `/pacientes/${PATIENT_ID}/cartillas`

describe('PatientWorkspaceLayout', () => {
  beforeEach(() => {
    vi.mocked(fetchCurrentUser).mockReset().mockResolvedValue(therapist)
    vi.mocked(fetchOrganizations).mockReset().mockResolvedValue([])
    vi.mocked(fetchPatient).mockReset().mockResolvedValue(therapistPatientsResponse[0])
    vi.mocked(fetchBoards).mockReset().mockResolvedValue(boardsListResponse)
    vi.mocked(updatePatient).mockReset()
    vi.mocked(deletePatient).mockReset()
  })

  it('redirects /pacientes/:id to the Cartillas tab', async () => {
    renderApp(`/pacientes/${PATIENT_ID}`)
    expect(await screen.findByText(`/pacientes/${PATIENT_ID}/cartillas`)).toBeInTheDocument()
  })

  it('shows every contextual section as a plain link: icon, name and active state, nothing else', async () => {
    renderApp(url)
    const nav = await screen.findByRole('navigation', { name: 'Secciones del paciente' })
    expect(within(nav).getByRole('link', { name: 'Cartillas' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'Sesiones' })).toHaveAttribute('href', `/pacientes/${PATIENT_ID}/sesiones`)
    expect(within(nav).getByRole('link', { name: 'Familia' })).toHaveAttribute('href', `/pacientes/${PATIENT_ID}/familia`)
    expect(within(nav).getByRole('link', { name: 'Pictogramas' })).toBeInTheDocument()
    // The primary action of each section lives in its own content header now, never inside the nav.
    const actionNames = ['Nueva cartilla', 'Registrar sesión', 'Vincular familiar', 'Subir pictograma']
    for (const name of actionNames) {
      expect(within(nav).queryByRole('link', { name })).not.toBeInTheDocument()
    }
  })

  it('hides Sesiones and Familia from a family collaborator, but keeps Pictogramas', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(familyMember)
    vi.mocked(fetchPatient).mockResolvedValue({ ...therapistPatientsResponse[0], miPermiso: 'LECTURA', capacidades: [] })
    renderApp(url)
    const nav = await screen.findByRole('navigation', { name: 'Secciones del paciente' })
    expect(within(nav).queryByRole('link', { name: 'Sesiones' })).not.toBeInTheDocument()
    expect(within(nav).queryByRole('link', { name: 'Familia' })).not.toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Pictogramas' })).toBeInTheDocument()
  })

  it('shows "Abrir Modo Uso" only when the patient has a principal board', async () => {
    renderApp(url)
    expect(await screen.findByRole('link', { name: 'Abrir Modo Uso' })).toHaveAttribute(
      'href',
      `/pacientes/${PATIENT_ID}/cartillas/c-1/uso`,
    )
  })

  it('lets a family collaborator with EDICION_LIMITADA edit the patient data, but not delete the patient', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(familyMember)
    vi.mocked(fetchPatient).mockResolvedValue({ ...therapistPatientsResponse[0], miPermiso: 'EDICION_LIMITADA', capacidades: ['EDITAR_CONTENIDO'] })
    renderApp(url)
    await screen.findByRole('heading', { name: 'Tomás Pérez' })
    expect(screen.getByRole('button', { name: 'Editar datos del paciente' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Eliminar paciente' })).not.toBeInTheDocument()
  })

  it('edits the patient data with the real fields', async () => {
    vi.mocked(updatePatient).mockResolvedValue({ ...therapistPatientsResponse[0], nombre: 'Tomás Ariel' })
    renderApp(url)
    await screen.findByRole('heading', { name: 'Tomás Pérez' })

    await userEvent.click(screen.getByRole('button', { name: 'Editar datos del paciente' }))
    const nombreInput = screen.getByLabelText('Nombre')
    await userEvent.clear(nombreInput)
    await userEvent.type(nombreInput, 'Tomás Ariel')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(updatePatient).toHaveBeenCalledWith(
      PATIENT_ID,
      expect.objectContaining({ nombre: 'Tomás Ariel', apellido: 'Pérez' }),
    )
  })

  it('deletes the patient after confirmation and returns to the directory', async () => {
    vi.mocked(deletePatient).mockResolvedValue(undefined)
    // Deleting needs ADMINISTRAR (OWNER/ADMIN of the organization), not just the clinical team.
    vi.mocked(fetchPatient).mockResolvedValue({
      ...therapistPatientsResponse[0],
      capacidades: ['EDITAR_CONTENIDO', 'GESTION_CLINICA', 'ADMINISTRAR'],
    })
    renderApp(url)
    await screen.findByRole('heading', { name: 'Tomás Pérez' })

    await userEvent.click(screen.getByRole('button', { name: 'Eliminar paciente' }))
    expect(screen.getByText(/sus cartillas, categorías y tarjetas/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Sí, eliminar definitivamente' }))

    expect(deletePatient).toHaveBeenCalledWith(PATIENT_ID)
    expect(await screen.findByText('/pacientes')).toBeInTheDocument()
  })

  describe('header', () => {
    const capabilitiesCases: [string, Capability[], string[]][] = [
      ['ADMINISTRAR', ['EDITAR_CONTENIDO', 'GESTION_CLINICA', 'ADMINISTRAR'], ['Editar datos del paciente', 'Eliminar paciente']],
      ['therapist', ['EDITAR_CONTENIDO', 'GESTION_CLINICA'], ['Editar datos del paciente']],
      ['EDICION_LIMITADA', ['EDITAR_CONTENIDO'], ['Editar datos del paciente']],
      ['LECTURA', [], []],
    ]

    it.each(capabilitiesCases)('offers %s only what the backend allows', async (_label, capacidades, actions) => {
      vi.mocked(fetchPatient).mockResolvedValue({ ...therapistPatientsResponse[0], capacidades })
      renderApp(url)
      await screen.findByRole('heading', { level: 1 })
      for (const name of ['Editar datos del paciente', 'Eliminar paciente']) {
        expect(screen.queryAllByRole('button', { name })).toHaveLength(actions.includes(name) ? 1 : 0)
      }
    })

    it('identifies the organization of the patient, linking to that space', async () => {
      vi.mocked(fetchOrganizations).mockResolvedValue([{ ...ownerOrganization, id: therapistPatientsResponse[0].organizacionId }])
      renderApp(url)
      const heading = await screen.findByRole('heading', { level: 1 })
      const header = within(heading.closest('header')!)
      expect(await header.findByRole('link', { name: ownerOrganization.nombre })).toHaveAttribute(
        'href',
        `/pacientes?espacio=${therapistPatientsResponse[0].organizacionId}`,
      )
    })

    it('identifies a family link as shared, with its permission', async () => {
      vi.mocked(fetchPatient).mockResolvedValue({ ...therapistPatientsResponse[0], miPermiso: 'LECTURA', capacidades: [] })
      renderApp(url)
      expect(await screen.findByRole('link', { name: 'Compartido como familiar · Solo lectura' })).toHaveAttribute(
        'href',
        '/pacientes?espacio=compartidos',
      )
    })

    it('shows nothing about the patient when the backend refuses it, and offers a retry', async () => {
      vi.mocked(fetchPatient).mockRejectedValue(new Error('404'))
      renderApp(url)
      expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
      expect(screen.queryByRole('navigation', { name: 'Secciones del paciente' })).not.toBeInTheDocument()
    })

    it('announces the loading state', async () => {
      vi.mocked(fetchPatient).mockReturnValue(new Promise(() => {}))
      renderApp(url)
      expect(await screen.findByText('Cargando paciente…')).toHaveAttribute('role', 'status')
    })
  })

  it('moves between the sections with the keyboard', async () => {
    renderApp(url)
    const nav = await screen.findByRole('navigation', { name: 'Secciones del paciente' })
    const links = within(nav).getAllByRole('link')
    links[0].focus()
    await userEvent.tab()
    expect(links[1]).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(await screen.findByTestId('location')).toHaveTextContent(`/pacientes/${PATIENT_ID}/sesiones`)
  })
})
