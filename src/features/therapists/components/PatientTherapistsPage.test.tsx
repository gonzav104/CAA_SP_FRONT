import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchCurrentUser } from '@/features/auth/authApi'
import { fetchBoards } from '@/features/boards/boardsApi'
import type { MiembroResponse } from '@/features/organizations/apiTypes'
import { fetchMembers } from '@/features/organizations/membersApi'
import type { PacienteResponse } from '@/features/patients/apiTypes'
import { fetchPatient } from '@/features/patients/patientsApi'
import { familyMember, therapist, therapistPatientsResponse } from '@/features/patients/testing/fixtures'
import { renderApp } from '@/test/renderApp'
import { assignTherapist, fetchAssignedTherapists, unassignTherapist } from '../therapistsApi'

vi.mock('@/features/auth/authApi')
vi.mock('@/features/patients/patientsApi')
vi.mock('@/features/boards/boardsApi')
vi.mock('@/features/organizations/membersApi')
vi.mock('../therapistsApi')

const base = therapistPatientsResponse[0]
const PATIENT_ID = base.id
const url = `/pacientes/${PATIENT_ID}/equipo`
const asAdmin: PacienteResponse = { ...base, capacidades: ['EDITAR_CONTENIDO', 'GESTION_CLINICA', 'ADMINISTRAR'] }
const asAssignedTherapist: PacienteResponse = { ...base, capacidades: ['EDITAR_CONTENIDO', 'GESTION_CLINICA'] }

const bruno = { usuarioId: 'u-bruno', nombre: 'Bruno', email: 'bruno@example.com', asignadoEn: '2026-01-01T00:00:00' }
const member = (overrides: Partial<MiembroResponse>): MiembroResponse => ({
  usuarioId: 'u-x',
  nombre: 'X',
  email: 'x@example.com',
  rolGestion: 'MIEMBRO',
  esTerapeuta: true,
  unidoEn: '2026-01-01T00:00:00',
  ...overrides,
})
const members = [
  member({ usuarioId: 'u-bruno', nombre: 'Bruno', email: 'bruno@example.com' }),
  member({ usuarioId: 'u-carla', nombre: 'Carla', email: 'carla@example.com' }),
  member({ usuarioId: 'u-dani', nombre: 'Dani', email: 'dani@example.com', esTerapeuta: false }),
]

function httpError(status: number): AxiosError {
  const config = { headers: {} } as InternalAxiosRequestConfig
  return new AxiosError('failed', 'ERR_BAD_REQUEST', config, null, { status, statusText: '', headers: {}, config, data: {} })
}

describe('PatientTherapistsPage', () => {
  beforeEach(() => {
    vi.mocked(fetchCurrentUser).mockReset().mockResolvedValue(therapist)
    vi.mocked(fetchPatient).mockReset().mockResolvedValue(asAdmin)
    vi.mocked(fetchBoards).mockReset().mockResolvedValue([])
    vi.mocked(fetchMembers).mockReset().mockResolvedValue(members)
    vi.mocked(fetchAssignedTherapists).mockReset().mockResolvedValue([bruno])
    vi.mocked(assignTherapist).mockReset()
    vi.mocked(unassignTherapist).mockReset()
  })

  it('ADMINISTRAR: offers only therapist members of the patient organization who are not assigned yet', async () => {
    renderApp(url)
    const list = await screen.findByRole('list', { name: 'Terapeutas asignados' })
    expect(within(list).getByText('Bruno')).toBeInTheDocument()
    expect(fetchMembers).toHaveBeenCalledWith(base.organizacionId)
    const options = within(screen.getByLabelText('Asignar terapeuta')).getAllByRole('option')
    // Bruno is already assigned; Dani is a member but not a therapist.
    expect(options.map((option) => option.textContent)).toEqual(['Elegí un terapeuta del espacio', 'Carla (carla@example.com)'])
  })

  it('assigns a therapist and refreshes the team and the patient', async () => {
    vi.mocked(assignTherapist).mockResolvedValue({ ...bruno, usuarioId: 'u-carla', nombre: 'Carla' })
    renderApp(url)
    await userEvent.selectOptions(await screen.findByLabelText('Asignar terapeuta'), 'u-carla')
    vi.mocked(fetchAssignedTherapists).mockResolvedValue([bruno, { ...bruno, usuarioId: 'u-carla', nombre: 'Carla', email: 'carla@example.com' }])
    await userEvent.click(screen.getByRole('button', { name: 'Asignar' }))

    expect(assignTherapist).toHaveBeenCalledExactlyOnceWith(PATIENT_ID, 'u-carla')
    const list = screen.getByRole('list', { name: 'Terapeutas asignados' })
    expect(await within(list).findByText('Carla')).toBeInTheDocument()
    await vi.waitFor(() => expect(fetchPatient).toHaveBeenCalledTimes(2))
  })

  it('unassigns only after confirmation, keeping the membership untouched', async () => {
    vi.mocked(unassignTherapist).mockResolvedValue(undefined)
    renderApp(url)
    const list = await screen.findByRole('list', { name: 'Terapeutas asignados' })
    await userEvent.click(within(list).getByRole('button', { name: 'Quitar asignación' }))
    expect(screen.getByText('Seguirá siendo miembro del espacio, pero dejará de atender a este paciente.')).toBeInTheDocument()
    expect(unassignTherapist).not.toHaveBeenCalled()
    vi.mocked(fetchAssignedTherapists).mockResolvedValue([])
    await userEvent.click(screen.getByRole('button', { name: 'Sí, quitar asignación' }))
    expect(unassignTherapist).toHaveBeenCalledExactlyOnceWith(PATIENT_ID, 'u-bruno')
    expect(await screen.findByText('Este paciente todavía no tiene terapeutas asignados.')).toBeInTheDocument()
  })

  it.each([
    [409, 'Esa persona ya no tiene el rol de terapeuta en el espacio.'],
    [404, 'No tienes permiso para cambiar el equipo de este paciente, o esa persona ya no es miembro del espacio.'],
  ])('shows the backend refusal %i when assigning', async (status, message) => {
    vi.mocked(assignTherapist).mockRejectedValue(httpError(status))
    renderApp(url)
    await userEvent.selectOptions(await screen.findByLabelText('Asignar terapeuta'), 'u-carla')
    await userEvent.click(screen.getByRole('button', { name: 'Asignar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
  })

  it('a 409 (the member lost the therapist role) refreshes the candidates', async () => {
    vi.mocked(assignTherapist).mockRejectedValue(httpError(409))
    renderApp(url)
    await userEvent.selectOptions(await screen.findByLabelText('Asignar terapeuta'), 'u-carla')
    vi.mocked(fetchMembers).mockResolvedValue(members.map((m) => (m.usuarioId === 'u-carla' ? { ...m, esTerapeuta: false } : m)))
    await userEvent.click(screen.getByRole('button', { name: 'Asignar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Esa persona ya no tiene el rol de terapeuta en el espacio.')
    await vi.waitFor(() =>
      expect(screen.getByText(/No hay más terapeutas del espacio para asignar/)).toBeInTheDocument(),
    )
  })

  it('an assigned therapist (GESTION_CLINICA without ADMINISTRAR) sees the team but cannot change it', async () => {
    vi.mocked(fetchPatient).mockResolvedValue(asAssignedTherapist)
    renderApp(url)
    await screen.findByRole('list', { name: 'Terapeutas asignados' })
    expect(screen.queryByLabelText('Asignar terapeuta')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Quitar asignación' })).not.toBeInTheDocument()
    expect(fetchMembers).not.toHaveBeenCalled()
  })

  it.each([
    ['LECTURA', []],
    ['EDICION_LIMITADA', ['EDITAR_CONTENIDO']],
  ] as const)('a family member with %s has no Equipo tab and requests nothing', async (miPermiso, capacidades) => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(familyMember)
    vi.mocked(fetchPatient).mockResolvedValue({ ...base, miPermiso, capacidades: [...capacidades] })
    renderApp(url)
    expect(await screen.findByText('Solo el equipo clínico del paciente puede ver a sus terapeutas.')).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Secciones del paciente' })
    expect(within(nav).queryByRole('link', { name: 'Equipo' })).not.toBeInTheDocument()
    expect(fetchAssignedTherapists).not.toHaveBeenCalled()
  })

  it('a 404 because ADMINISTRAR was lost refreshes the patient and hides the controls', async () => {
    vi.mocked(assignTherapist).mockRejectedValue(httpError(404))
    renderApp(url)
    await userEvent.selectOptions(await screen.findByLabelText('Asignar terapeuta'), 'u-carla')
    vi.mocked(fetchPatient).mockResolvedValue(asAssignedTherapist)
    await userEvent.click(screen.getByRole('button', { name: 'Asignar' }))
    await vi.waitFor(() => expect(screen.queryByLabelText('Asignar terapeuta')).not.toBeInTheDocument())
  })

  it('losing ADMINISTRAR after a refetch hides the assignment controls', async () => {
    renderApp(url)
    expect(await screen.findByLabelText('Asignar terapeuta')).toBeInTheDocument()
    vi.mocked(fetchPatient).mockResolvedValue(asAssignedTherapist)
    vi.mocked(assignTherapist).mockResolvedValue(bruno)
    await userEvent.selectOptions(screen.getByLabelText('Asignar terapeuta'), 'u-carla')
    await userEvent.click(screen.getByRole('button', { name: 'Asignar' }))
    await vi.waitFor(() => expect(screen.queryByLabelText('Asignar terapeuta')).not.toBeInTheDocument())
  })
})
