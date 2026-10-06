import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import type { CurrentUser } from '@/features/auth/types'
import type { PacienteResponse } from '@/features/patients/apiTypes'
import { familyMember, therapist, therapistPatientsResponse } from '@/features/patients/testing/fixtures'
import { renderApp } from '@/test/renderApp'
import type { CartillaDetalleResponse, CartillaResponse } from '../apiTypes'
import { boardDetailResponse, OTHER_CREATOR_ID, PATIENT_ID } from '../testing/fixtures'

const url = `/pacientes/${PATIENT_ID}/cartillas`
const listPath = `/api/pacientes/${PATIENT_ID}/cartillas`
const boardPath = (id: string) => `${listPath}/${id}`
const primaryPath = (id: string) => `${boardPath(id)}/principal`

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

function networkError() {
  return new AxiosError('Network Error', 'ERR_NETWORK')
}

interface Controls {
  failListGet: boolean
  failDetailGet: boolean
  failCreate: unknown
  failRename: unknown
  failPrimary: unknown
  failDelete: unknown
  /** Runs inside the primary PUT before it answers (e.g. to change the principal behind the UI). */
  beforePrimary: (() => void) | null
  primaryGate: Promise<void> | null
  detailGate: Promise<void> | null
  /** Detail overrides by cartilla id. */
  details: Record<string, CartillaDetalleResponse>
}

function initialBoards(): CartillaResponse[] {
  return [
    { id: 'c-1', pacienteId: PATIENT_ID, creadorId: therapist.id, nombre: 'Principal', esPrincipal: true, creadoEn: '2026-02-01T09:00:00' },
    { id: 'c-2', pacienteId: PATIENT_ID, creadorId: therapist.id, nombre: 'Casa', esPrincipal: false, creadoEn: '2026-02-15T09:00:00' },
    { id: 'c-3', pacienteId: PATIENT_ID, creadorId: OTHER_CREATOR_ID, nombre: 'Escuela', esPrincipal: false, creadoEn: '2026-03-01T09:00:00' },
    { id: 'c-4', pacienteId: PATIENT_ID, creadorId: therapist.id, nombre: 'Paseo', esPrincipal: false, creadoEn: '2026-01-10T09:00:00' },
  ]
}

interface SetupOptions {
  user?: CurrentUser
  patient?: PacienteResponse
  boards?: CartillaResponse[]
}

/**
 * Fake backend over the axios client: list GET, detail GET, create POST (appends a non-principal cartilla owned
 * by the current user), rename PUT (replaces only the name), principal PUT (unmarks the previous principal)
 * and DELETE (removes the cartilla).
 */
function setupApi({ user = therapist, patient = therapistPatientsResponse[0], boards = initialBoards() }: SetupOptions = {}) {
  const server = { boards }
  const controls: Controls = {
    failListGet: false,
    failDetailGet: false,
    failCreate: null,
    failRename: null,
    failPrimary: null,
    failDelete: null,
    beforePrimary: null,
    primaryGate: null,
    detailGate: null,
    details: {},
  }
  let counter = 0

  const detailOf = (id: string): CartillaDetalleResponse => {
    const board = server.boards.find((candidate) => candidate.id === id)
    if (!board) throw httpError(404)
    return (
      controls.details[id] ?? {
        ...structuredClone(boardDetailResponse),
        id,
        nombre: board.nombre,
        esPrincipal: board.esPrincipal,
        creadorId: board.creadorId,
      }
    )
  }

  const get = vi.spyOn(api, 'get').mockImplementation(async (requestUrl: string) => {
    if (requestUrl === '/api/usuarios/me') return { data: user }
    if (requestUrl === `/api/pacientes/${PATIENT_ID}`) return { data: patient }
    if (requestUrl === listPath) {
      if (controls.failListGet) throw networkError()
      return { data: structuredClone(server.boards) }
    }
    const board = server.boards.find((candidate) => requestUrl === boardPath(candidate.id))
    if (board) {
      if (controls.detailGate) await controls.detailGate
      if (controls.failDetailGet) throw networkError()
      return { data: structuredClone(detailOf(board.id)) }
    }
    throw new Error(`Unexpected GET ${requestUrl}`)
  })
  const post = vi.spyOn(api, 'post').mockImplementation(async (requestUrl: string, body?: unknown) => {
    if (requestUrl !== listPath) throw new Error(`Unexpected POST ${requestUrl}`)
    if (controls.failCreate) throw controls.failCreate
    counter += 1
    const created: CartillaResponse = {
      id: `new-${counter}`,
      pacienteId: PATIENT_ID,
      creadorId: user.id,
      nombre: (body as { nombre: string }).nombre,
      esPrincipal: false,
      creadoEn: '2026-06-01T09:00:00',
    }
    server.boards.push(created)
    return { data: created }
  })
  const put = vi.spyOn(api, 'put').mockImplementation(async (requestUrl: string, body?: unknown) => {
    const byPrimary = server.boards.find((candidate) => requestUrl === primaryPath(candidate.id))
    if (byPrimary) {
      if (controls.primaryGate) await controls.primaryGate
      controls.beforePrimary?.()
      if (controls.failPrimary) throw controls.failPrimary
      server.boards = server.boards.map((candidate) => ({ ...candidate, esPrincipal: candidate.id === byPrimary.id }))
      return { data: { ...byPrimary, esPrincipal: true } }
    }
    const board = server.boards.find((candidate) => requestUrl === boardPath(candidate.id))
    if (!board) throw new Error(`Unexpected PUT ${requestUrl}`)
    if (controls.failRename) throw controls.failRename
    board.nombre = (body as { nombre: string }).nombre
    return { data: board }
  })
  const del = vi.spyOn(api, 'delete').mockImplementation(async (requestUrl: string) => {
    const board = server.boards.find((candidate) => requestUrl === boardPath(candidate.id))
    if (!board) throw new Error(`Unexpected DELETE ${requestUrl}`)
    if (controls.failDelete) throw controls.failDelete
    server.boards = server.boards.filter((candidate) => candidate.id !== board.id)
    return { data: undefined }
  })
  const patch = vi.spyOn(api, 'patch')
  const listGets = () => get.mock.calls.filter(([requestUrl]) => requestUrl === listPath).length
  const detailGets = () => get.mock.calls.filter(([requestUrl]) => requestUrl !== listPath && requestUrl.startsWith(`${listPath}/`)).length
  return { server, controls, get, post, put, del, patch, listGets, detailGets }
}

function gate() {
  let release!: () => void
  const promise = new Promise<void>((resolve) => {
    release = resolve
  })
  return { promise, release }
}

const familyPatient = (miPermiso: 'LECTURA' | 'EDICION_LIMITADA'): PacienteResponse => ({
  ...therapistPatientsResponse[0],
  miPermiso,
})

async function openList() {
  renderApp(url)
  await screen.findByRole('heading', { name: 'Tomás Pérez' })
  await screen.findAllByRole('listitem')
}

function rowNames(): string[] {
  return screen.getAllByRole('listitem').map((row) => row.querySelector('span')?.textContent ?? '')
}

function rowOf(name: string): HTMLElement {
  const row = screen.getAllByRole('listitem').find((candidate) => candidate.querySelector('span')?.textContent === name)
  if (!row) throw new Error(`No row named ${name}`)
  return row
}

const primaryBadge = (row: HTMLElement) => within(row).queryByText('Principal', { selector: 'span.rounded-full' })

describe('BoardsPage cartilla CRUD', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('create', () => {
    it('creates as the responsible therapist: POST with only nombre, list refreshed, success notice, form closed', async () => {
      const fake = setupApi()
      const user = userEvent.setup()
      await openList()

      await user.click(screen.getByRole('button', { name: 'Nueva cartilla' }))
      expect(screen.getByRole('textbox', { name: 'Nombre de la nueva cartilla' })).toHaveAttribute('maxlength', '100')
      await user.type(screen.getByRole('textbox', { name: 'Nombre de la nueva cartilla' }), '  Cumpleaños  ')
      await user.click(screen.getByRole('button', { name: 'Crear cartilla' }))

      expect(await screen.findByRole('status')).toHaveTextContent('Cartilla creada.')
      expect(fake.post).toHaveBeenCalledExactlyOnceWith(listPath, { nombre: 'Cumpleaños' })
      expect(rowNames()).toContain('Cumpleaños')
      expect(screen.queryByRole('textbox', { name: 'Nombre de la nueva cartilla' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Nueva cartilla' })).toBeInTheDocument()
      expect(fake.put).not.toHaveBeenCalled()
      expect(fake.patch).not.toHaveBeenCalled()
    })

    it('lets a familiar with EDICION_LIMITADA create, and the new cartilla is theirs to edit but not to mark', async () => {
      const fake = setupApi({ user: familyMember, patient: familyPatient('EDICION_LIMITADA') })
      const user = userEvent.setup()
      await openList()

      await user.click(screen.getByRole('button', { name: 'Nueva cartilla' }))
      await user.type(screen.getByRole('textbox', { name: 'Nombre de la nueva cartilla' }), 'De Rosa')
      await user.click(screen.getByRole('button', { name: 'Crear cartilla' }))

      expect(await screen.findByText('Cartilla creada.')).toBeInTheDocument()
      expect(fake.post).toHaveBeenCalledExactlyOnceWith(listPath, { nombre: 'De Rosa' })
      const row = rowOf('De Rosa')
      expect(within(row).getByRole('button', { name: 'Renombrar De Rosa' })).toBeInTheDocument()
      expect(within(row).getByRole('button', { name: 'Eliminar De Rosa' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /como principal/ })).not.toBeInTheDocument()
    })

    it('does not offer creation to a read-only familiar, nor any other action on cartillas of others', async () => {
      setupApi({ user: familyMember, patient: familyPatient('LECTURA') })
      await openList()

      expect(screen.queryByRole('button', { name: 'Nueva cartilla' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /^Renombrar / })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /^Eliminar / })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /como principal/ })).not.toBeInTheDocument()
      expect(screen.getAllByText('Solo lectura')).toHaveLength(4)
    })

    it('validates only after the field is touched, rejects blank names and limits the length', async () => {
      const fake = setupApi()
      const user = userEvent.setup()
      await openList()

      await user.click(screen.getByRole('button', { name: 'Nueva cartilla' }))
      const input = screen.getByRole('textbox', { name: 'Nombre de la nueva cartilla' })
      expect(screen.queryByText('El nombre es obligatorio.')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Crear cartilla' })).toBeDisabled()

      await user.type(input, '   ')
      expect(screen.getByText('El nombre es obligatorio.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Crear cartilla' })).toBeDisabled()
      await user.type(input, '{Enter}')
      expect(fake.post).not.toHaveBeenCalled()

      await user.clear(input)
      await user.type(input, 'x'.repeat(120))
      expect(input).toHaveValue('x'.repeat(100))
    })

    it('Escape and Cancelar close the form without any request', async () => {
      const fake = setupApi()
      const user = userEvent.setup()
      await openList()

      await user.click(screen.getByRole('button', { name: 'Nueva cartilla' }))
      await user.type(screen.getByRole('textbox', { name: 'Nombre de la nueva cartilla' }), 'Algo')
      await user.keyboard('{Escape}')
      expect(screen.queryByRole('textbox', { name: 'Nombre de la nueva cartilla' })).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Nueva cartilla' }))
      await user.click(screen.getByRole('button', { name: 'Cancelar' }))
      expect(screen.queryByRole('textbox', { name: 'Nombre de la nueva cartilla' })).not.toBeInTheDocument()
      expect(fake.post).not.toHaveBeenCalled()
    })

    it('keeps the typed text and shows the error inline when the creation fails', async () => {
      const fake = setupApi()
      fake.controls.failCreate = networkError()
      const user = userEvent.setup()
      await openList()

      await user.click(screen.getByRole('button', { name: 'Nueva cartilla' }))
      await user.type(screen.getByRole('textbox', { name: 'Nombre de la nueva cartilla' }), 'Fallida')
      await user.click(screen.getByRole('button', { name: 'Crear cartilla' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo conectar con el servidor.')
      expect(screen.getByRole('textbox', { name: 'Nombre de la nueva cartilla' })).toHaveValue('Fallida')
      expect(screen.queryByText('Cartilla creada.')).not.toBeInTheDocument()
    })

    it('shows the 404 permission message inline', async () => {
      const fake = setupApi()
      fake.controls.failCreate = httpError(404)
      const user = userEvent.setup()
      await openList()

      await user.click(screen.getByRole('button', { name: 'Nueva cartilla' }))
      await user.type(screen.getByRole('textbox', { name: 'Nombre de la nueva cartilla' }), 'Otra')
      await user.click(screen.getByRole('button', { name: 'Crear cartilla' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('No tienes permiso para crear cartillas para este paciente.')
    })
  })

  describe('rename', () => {
    it('renames an own cartilla: PUT with only nombre, Enter submits, list and notice update', async () => {
      const fake = setupApi()
      const user = userEvent.setup()
      await openList()

      await user.click(screen.getByRole('button', { name: 'Renombrar Casa' }))
      const input = screen.getByRole('textbox', { name: 'Nombre de la cartilla' })
      expect(input).toHaveValue('Casa')
      expect(input).toHaveAttribute('maxlength', '100')
      await user.clear(input)
      await user.type(input, ' Hogar {Enter}')

      expect(await screen.findByRole('status')).toHaveTextContent('Cartilla renombrada.')
      expect(fake.put).toHaveBeenCalledExactlyOnceWith(boardPath('c-2'), { nombre: 'Hogar' })
      const body = fake.put.mock.calls[0][1] as object
      expect(Object.keys(body)).toEqual(['nombre'])
      expect(rowNames()).toContain('Hogar')
      expect(rowNames()).not.toContain('Casa')
      expect(screen.queryByRole('textbox', { name: 'Nombre de la cartilla' })).not.toBeInTheDocument()
    })

    it('disables Guardar while blank or unchanged, and Escape cancels without a request', async () => {
      const fake = setupApi()
      const user = userEvent.setup()
      await openList()

      await user.click(screen.getByRole('button', { name: 'Renombrar Casa' }))
      const input = screen.getByRole('textbox', { name: 'Nombre de la cartilla' })
      expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled()
      await user.type(input, '{Backspace}{Backspace}{Backspace}{Backspace}')
      expect(screen.getByText('El nombre es obligatorio.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled()
      await user.type(input, '  Casa  ')
      expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled()
      await user.type(input, 'x')
      expect(screen.getByRole('button', { name: 'Guardar' })).toBeEnabled()
      await user.keyboard('{Escape}')

      expect(screen.queryByRole('textbox', { name: 'Nombre de la cartilla' })).not.toBeInTheDocument()
      expect(rowNames()).toContain('Casa')
      expect(fake.put).not.toHaveBeenCalled()
    })

    it('keeps the typed text and shows the error inline when the rename fails', async () => {
      const fake = setupApi()
      fake.controls.failRename = httpError(409)
      const user = userEvent.setup()
      await openList()

      await user.click(screen.getByRole('button', { name: 'Renombrar Casa' }))
      const input = screen.getByRole('textbox', { name: 'Nombre de la cartilla' })
      await user.clear(input)
      await user.type(input, 'Hogar')
      await user.click(screen.getByRole('button', { name: 'Guardar' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('La operación entra en conflicto con datos existentes.')
      expect(screen.getByRole('textbox', { name: 'Nombre de la cartilla' })).toHaveValue('Hogar')
    })

    it('closes the editor with the not-found message when the cartilla is gone (404)', async () => {
      const fake = setupApi()
      fake.controls.failRename = httpError(404)
      const user = userEvent.setup()
      await openList()

      await user.click(screen.getByRole('button', { name: 'Renombrar Casa' }))
      await user.type(screen.getByRole('textbox', { name: 'Nombre de la cartilla' }), 'x')
      await user.click(screen.getByRole('button', { name: 'Guardar' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('La cartilla ya no existe o no tienes permiso para modificarla.')
      expect(screen.queryByRole('textbox', { name: 'Nombre de la cartilla' })).not.toBeInTheDocument()
    })

    it('is not offered for a cartilla created by someone else', async () => {
      setupApi()
      await openList()

      expect(screen.queryByRole('button', { name: 'Renombrar Escuela' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Renombrar Casa' })).toBeInTheDocument()
    })
  })

  describe('mark as principal', () => {
    it('sends exactly ONE PUT to /principal with no body, moves the badge after the refetch and shows the notice', async () => {
      const fake = setupApi()
      const user = userEvent.setup()
      await openList()
      expect(rowNames()).toEqual(['Principal', 'Paseo', 'Casa', 'Escuela'])

      await user.click(screen.getByRole('button', { name: 'Marcar Paseo como principal' }))

      expect(await screen.findByRole('status')).toHaveTextContent('«Paseo» es ahora la cartilla principal.')
      expect(fake.put).toHaveBeenCalledOnce()
      expect(fake.put.mock.calls[0]).toEqual([primaryPath('c-4')])
      expect(fake.post).not.toHaveBeenCalled()
      expect(fake.patch).not.toHaveBeenCalled()
      await waitFor(() => expect(rowNames()).toEqual(['Paseo', 'Principal', 'Casa', 'Escuela']))
      expect(primaryBadge(rowOf('Paseo'))).toBeInTheDocument()
      expect(primaryBadge(rowOf('Principal'))).not.toBeInTheDocument()
      // The old principal now offers the action, the new one no longer does.
      expect(screen.getByRole('button', { name: 'Marcar Principal como principal' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Marcar Paseo como principal' })).not.toBeInTheDocument()
    })

    it('is never offered on the principal, and works for a cartilla created by someone else', async () => {
      const fake = setupApi()
      const user = userEvent.setup()
      await openList()

      expect(within(rowOf('Principal')).queryByRole('button', { name: /como principal/ })).not.toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Marcar Escuela como principal' }))

      expect(await screen.findByText('«Escuela» es ahora la cartilla principal.')).toBeInTheDocument()
      expect(fake.put).toHaveBeenCalledExactlyOnceWith(primaryPath('c-3'))
    })

    it('shows a transient state and disables every action while it is pending', async () => {
      const fake = setupApi()
      const pending = gate()
      fake.controls.primaryGate = pending.promise
      const user = userEvent.setup()
      await openList()

      await user.click(screen.getByRole('button', { name: 'Marcar Paseo como principal' }))

      expect(await screen.findByText('Marcando…')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Marcar Paseo como principal' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Nueva cartilla' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Renombrar Casa' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Eliminar Casa' })).toBeDisabled()
      pending.release()
      expect(await screen.findByText('«Paseo» es ahora la cartilla principal.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Renombrar Casa' })).toBeEnabled()
    })

    it('on a 409 shows the amber info message and the list shows the principal the server holds now', async () => {
      const fake = setupApi()
      fake.controls.beforePrimary = () => {
        // Someone else marked "Casa" while the user was acting.
        fake.server.boards = fake.server.boards.map((board) => ({ ...board, esPrincipal: board.id === 'c-2' }))
      }
      fake.controls.failPrimary = httpError(409)
      const user = userEvent.setup()
      await openList()

      await user.click(screen.getByRole('button', { name: 'Marcar Paseo como principal' }))

      const info = await screen.findByRole('status')
      expect(info).toHaveTextContent(
        'La cartilla principal cambió mientras hacías el cambio. Se actualizó la lista con la información actual.',
      )
      expect(info).toHaveClass('bg-amber-50')
      expect(screen.queryByText(/es ahora la cartilla principal/)).not.toBeInTheDocument()
      await waitFor(() => expect(rowNames()[0]).toBe('Casa'))
      expect(primaryBadge(rowOf('Casa'))).toBeInTheDocument()
      expect(primaryBadge(rowOf('Paseo'))).not.toBeInTheDocument()
    })

    it.each([
      [403, 'Solo el terapeuta responsable del paciente puede cambiar la cartilla principal.'],
      [404, 'La cartilla ya no existe o no tienes acceso.'],
    ])('shows a red alert for a %i', async (status, message) => {
      const fake = setupApi()
      fake.controls.failPrimary = httpError(status)
      const user = userEvent.setup()
      await openList()

      await user.click(screen.getByRole('button', { name: 'Marcar Paseo como principal' }))

      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent(message)
      expect(alert).toHaveClass('bg-red-50')
      expect(fake.put).toHaveBeenCalledOnce()
    })

    it('is offered only to the responsible therapist', async () => {
      setupApi({ user: familyMember, patient: familyPatient('EDICION_LIMITADA') })
      await openList()

      expect(screen.queryByRole('button', { name: /como principal/ })).not.toBeInTheDocument()
    })
  })

  describe('delete', () => {
    it('opens an inline confirmation naming the cartilla with the plural counts, and Cancelar sends nothing', async () => {
      const fake = setupApi()
      const user = userEvent.setup()
      await openList()

      await user.click(screen.getByRole('button', { name: 'Eliminar Paseo' }))

      const group = screen.getByRole('group', { name: 'Confirmar eliminación de cartilla' })
      expect(within(rowOf('Paseo')).getByRole('group', { name: 'Confirmar eliminación de cartilla' })).toBe(group)
      expect(within(group).getByText('¿Eliminar la cartilla «Paseo»?')).toBeInTheDocument()
      expect(await within(group).findByText('Se eliminarán de forma permanente sus 2 categorías y sus 5 tarjetas.')).toBeInTheDocument()
      expect(within(group).getByText('No se puede deshacer.')).toBeInTheDocument()
      expect(within(group).queryByText(/Es la cartilla principal/)).not.toBeInTheDocument()
      expect(fake.detailGets()).toBe(1)

      await user.click(within(group).getByRole('button', { name: 'Cancelar' }))

      expect(screen.queryByRole('group', { name: 'Confirmar eliminación de cartilla' })).not.toBeInTheDocument()
      expect(fake.del).not.toHaveBeenCalled()
      expect(rowNames()).toContain('Paseo')
    })

    it('uses singular forms for one category and one card', async () => {
      const fake = setupApi()
      const single = structuredClone(boardDetailResponse)
      single.categorias = [{ ...single.categorias[0], items: [single.categorias[0].items[0]] }]
      fake.controls.details['c-4'] = single
      const user = userEvent.setup()
      await openList()

      await user.click(screen.getByRole('button', { name: 'Eliminar Paseo' }))

      expect(await screen.findByText('Se eliminarán de forma permanente sus 1 categoría y sus 1 tarjeta.')).toBeInTheDocument()
    })

    it('says so when the cartilla has no categories nor cards', async () => {
      const fake = setupApi()
      fake.controls.details['c-4'] = { ...structuredClone(boardDetailResponse), id: 'c-4', categorias: [] }
      const user = userEvent.setup()
      await openList()

      await user.click(screen.getByRole('button', { name: 'Eliminar Paseo' }))

      expect(await screen.findByText('La cartilla no tiene categorías ni tarjetas.')).toBeInTheDocument()
    })

    it('adds the extra warning for the principal cartilla', async () => {
      setupApi()
      const user = userEvent.setup()
      await openList()

      await user.click(screen.getByRole('button', { name: 'Eliminar Principal' }))

      expect(
        await screen.findByText(
          'Es la cartilla principal: el paciente quedará sin cartilla principal. No se elegirá otra automáticamente.',
        ),
      ).toBeInTheDocument()
    })

    it('disables "Sí, eliminar" while the content is being queried', async () => {
      const fake = setupApi()
      const pending = gate()
      fake.controls.detailGate = pending.promise
      const user = userEvent.setup()
      await openList()

      await user.click(screen.getByRole('button', { name: 'Eliminar Paseo' }))

      expect(await screen.findByText('Consultando su contenido…')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Sí, eliminar' })).toBeDisabled()
      pending.release()
      expect(await screen.findByText(/Se eliminarán de forma permanente/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Sí, eliminar' })).toBeEnabled()
    })

    it('sends ONE DELETE on confirm and the row disappears after the refetch', async () => {
      const fake = setupApi()
      const user = userEvent.setup()
      await openList()

      await user.click(screen.getByRole('button', { name: 'Eliminar Paseo' }))
      await screen.findByText(/Se eliminarán de forma permanente/)
      await user.click(screen.getByRole('button', { name: 'Sí, eliminar' }))

      expect(await screen.findByRole('status')).toHaveTextContent('Cartilla eliminada.')
      expect(fake.del).toHaveBeenCalledExactlyOnceWith(boardPath('c-4'))
      expect(rowNames()).toEqual(['Principal', 'Casa', 'Escuela'])
      expect(screen.queryByRole('group', { name: 'Confirmar eliminación de cartilla' })).not.toBeInTheDocument()
      expect(fake.put).not.toHaveBeenCalled()
    })

    it('keeps the row and the confirmation open with an inline error when the deletion fails', async () => {
      const fake = setupApi()
      fake.controls.failDelete = networkError()
      const user = userEvent.setup()
      await openList()

      await user.click(screen.getByRole('button', { name: 'Eliminar Paseo' }))
      await screen.findByText(/Se eliminarán de forma permanente/)
      await user.click(screen.getByRole('button', { name: 'Sí, eliminar' }))

      const group = screen.getByRole('group', { name: 'Confirmar eliminación de cartilla' })
      expect(await within(group).findByRole('alert')).toHaveTextContent('No se pudo conectar con el servidor.')
      expect(rowNames()).toContain('Paseo')
      expect(screen.queryByText('Cartilla eliminada.')).not.toBeInTheDocument()
    })

    it('still allows the deletion, with the warning, when the content query fails', async () => {
      const fake = setupApi()
      fake.controls.failDetailGet = true
      const user = userEvent.setup()
      await openList()

      await user.click(screen.getByRole('button', { name: 'Eliminar Paseo' }))

      expect(
        await screen.findByText('No se pudo consultar su contenido. Sus categorías y tarjetas se eliminarán igualmente.'),
      ).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Sí, eliminar' }))
      expect(await screen.findByText('Cartilla eliminada.')).toBeInTheDocument()
      expect(fake.del).toHaveBeenCalledExactlyOnceWith(boardPath('c-4'))
    })

    it('is offered only to the creator', async () => {
      setupApi()
      await openList()

      expect(screen.queryByRole('button', { name: 'Eliminar Escuela' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Eliminar Casa' })).toBeInTheDocument()
    })
  })

  describe('list reload failures', () => {
    it('keeps the stale list with an alert and Reintentar when the reload after a write fails, without a success notice', async () => {
      const fake = setupApi()
      const user = userEvent.setup()
      await openList()

      fake.controls.failListGet = true
      await user.click(screen.getByRole('button', { name: 'Renombrar Casa' }))
      const input = screen.getByRole('textbox', { name: 'Nombre de la cartilla' })
      await user.clear(input)
      await user.type(input, 'Hogar')
      await user.click(screen.getByRole('button', { name: 'Guardar' }))

      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent('El cambio se guardó, pero no se pudo actualizar la lista.')
      expect(screen.getAllByRole('alert')).toHaveLength(1)
      expect(screen.queryByText('Cartilla renombrada.')).not.toBeInTheDocument()
      // The stale list stays on screen.
      expect(rowNames()).toEqual(['Principal', 'Paseo', 'Casa', 'Escuela'])
      expect(screen.queryByRole('textbox', { name: 'Nombre de la cartilla' })).not.toBeInTheDocument()

      fake.controls.failListGet = false
      await user.click(within(alert).getByRole('button', { name: 'Reintentar' }))

      await waitFor(() => expect(rowNames()).toContain('Hogar'))
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('shows the list banner with Reintentar when a refetch fails and cached data exists', async () => {
      const fake = setupApi()
      const user = userEvent.setup()
      await openList()

      fake.controls.failListGet = true
      await user.click(screen.getByRole('button', { name: 'Marcar Paseo como principal' }))
      await screen.findByText('El cambio se guardó, pero no se pudo actualizar la lista.')
      // A new action clears the notice; the failed list refetch is still reported.
      await user.click(screen.getByRole('button', { name: 'Nueva cartilla' }))

      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent('No se pudo actualizar la lista.')
      expect(screen.getAllByRole('alert')).toHaveLength(1)
      expect(rowNames()).toHaveLength(4)

      fake.controls.failListGet = false
      await user.click(within(alert).getByRole('button', { name: 'Reintentar' }))
      await waitFor(() => expect(rowNames()[0]).toBe('Paseo'))
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  describe('inline editors', () => {
    it('keeps only one open at a time', async () => {
      setupApi()
      const user = userEvent.setup()
      await openList()

      await user.click(screen.getByRole('button', { name: 'Renombrar Casa' }))
      expect(screen.getByRole('textbox', { name: 'Nombre de la cartilla' })).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Eliminar Paseo' }))
      expect(screen.queryByRole('textbox', { name: 'Nombre de la cartilla' })).not.toBeInTheDocument()
      expect(screen.getAllByRole('group', { name: 'Confirmar eliminación de cartilla' })).toHaveLength(1)

      await user.click(screen.getByRole('button', { name: 'Nueva cartilla' }))
      expect(screen.queryByRole('group', { name: 'Confirmar eliminación de cartilla' })).not.toBeInTheDocument()
      expect(screen.getByRole('textbox', { name: 'Nombre de la nueva cartilla' })).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Renombrar Casa' }))
      expect(screen.queryByRole('textbox', { name: 'Nombre de la nueva cartilla' })).not.toBeInTheDocument()
      expect(screen.getAllByRole('textbox')).toHaveLength(1)
    })

    it('clears the previous notice when a new action starts', async () => {
      setupApi()
      const user = userEvent.setup()
      await openList()

      await user.click(screen.getByRole('button', { name: 'Marcar Paseo como principal' }))
      expect(await screen.findByRole('status')).toHaveTextContent('«Paseo» es ahora la cartilla principal.')
      await user.click(screen.getByRole('button', { name: 'Eliminar Casa' }))
      await user.click(screen.getByRole('button', { name: 'Cancelar' }))
      await user.click(screen.getByRole('button', { name: 'Nueva cartilla' }))

      expect(screen.queryByText('«Paseo» es ahora la cartilla principal.')).not.toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('offers the create button under the text when the user can create, and it opens the form', async () => {
      const fake = setupApi({ boards: [] })
      const user = userEvent.setup()
      renderApp(url)

      expect(await screen.findByText('Este paciente todavía no tiene cartillas.')).toBeInTheDocument()
      expect(screen.getAllByRole('button', { name: 'Nueva cartilla' })).toHaveLength(1)
      await user.click(screen.getByRole('button', { name: 'Nueva cartilla' }))
      await user.type(screen.getByRole('textbox', { name: 'Nombre de la nueva cartilla' }), 'Primera')
      await user.click(screen.getByRole('button', { name: 'Crear cartilla' }))

      expect(await screen.findByText('Cartilla creada.')).toBeInTheDocument()
      expect(fake.post).toHaveBeenCalledExactlyOnceWith(listPath, { nombre: 'Primera' })
      expect(rowNames()).toEqual(['Primera'])
      expect(screen.queryByText('Este paciente todavía no tiene cartillas.')).not.toBeInTheDocument()
    })

    it('keeps the plain copy without a button for a read-only familiar', async () => {
      setupApi({ user: familyMember, patient: familyPatient('LECTURA'), boards: [] })
      renderApp(url)

      expect(await screen.findByText('Este paciente todavía no tiene cartillas.')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Nueva cartilla' })).not.toBeInTheDocument()
    })
  })
})
