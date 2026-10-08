import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchCurrentUser } from '@/features/auth/authApi'
import type { CurrentUser } from '@/features/auth/types'
import { renderApp } from '@/test/renderApp'
import { createPatient, fetchPatients } from '../patientsApi'
import { familyMember, familyPatientsResponse, therapist, therapistPatientsResponse } from '../testing/fixtures'

vi.mock('@/features/auth/authApi')
vi.mock('../patientsApi')

function setup(user: CurrentUser) {
  vi.mocked(fetchCurrentUser).mockResolvedValue(user)
}

describe('PatientsPage', () => {
  beforeEach(() => {
    vi.mocked(fetchPatients).mockReset()
    vi.mocked(fetchCurrentUser).mockReset()
    vi.mocked(createPatient).mockReset()
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
    setup(familyMember)
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
    setup(familyMember)
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
    setup(familyMember)
    vi.mocked(fetchPatients).mockResolvedValue([])
    renderApp('/pacientes')
    await screen.findByText('Todavía no tenés pacientes vinculados.')
    expect(screen.queryByRole('button', { name: 'Nuevo paciente' })).not.toBeInTheDocument()
  })

  it('creates a patient with the real fields and refreshes the directory', async () => {
    setup(therapist)
    vi.mocked(fetchPatients).mockResolvedValueOnce([]).mockResolvedValue(therapistPatientsResponse)
    vi.mocked(createPatient).mockResolvedValue({
      id: 'p-new',
      nombre: 'Noa',
      apellido: 'Díaz',
      fechaNacimiento: '2019-01-01',
      creadoEn: '2026-01-01T00:00:00',
      miPermiso: null,
      gridSize: null,
    })
    renderApp('/pacientes')

    await userEvent.click(await screen.findByRole('button', { name: 'Nuevo paciente' }))
    await userEvent.type(screen.getByLabelText('Nombre'), 'Noa')
    await userEvent.type(screen.getByLabelText('Apellido'), 'Díaz')
    await userEvent.type(screen.getByLabelText('Fecha de nacimiento'), '2019-01-01')
    await userEvent.click(screen.getByRole('button', { name: 'Crear paciente' }))

    expect(createPatient).toHaveBeenCalledWith({ nombre: 'Noa', apellido: 'Díaz', fechaNacimiento: '2019-01-01' })
    expect(await screen.findByText('Bruno Álvarez')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Crear paciente' })).not.toBeInTheDocument()
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

  it('shows a server error and keeps the typed values', async () => {
    setup(therapist)
    vi.mocked(fetchPatients).mockResolvedValue([])
    vi.mocked(createPatient).mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'))
    renderApp('/pacientes')
    await userEvent.click(await screen.findByRole('button', { name: 'Nuevo paciente' }))
    await userEvent.type(screen.getByLabelText('Nombre'), 'Noa')
    await userEvent.type(screen.getByLabelText('Apellido'), 'Díaz')
    await userEvent.type(screen.getByLabelText('Fecha de nacimiento'), '2019-01-01')

    await userEvent.click(screen.getByRole('button', { name: 'Crear paciente' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo conectar con el servidor.')
    expect(screen.getByLabelText('Nombre')).toHaveValue('Noa')
  })
})
