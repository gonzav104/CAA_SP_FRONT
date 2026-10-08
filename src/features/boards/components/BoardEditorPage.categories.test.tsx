import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import { UNSAVED_CHANGES_MESSAGE } from '@/lib/useUnsavedChangesGuard'
import { therapist, therapistPatientsResponse } from '@/features/patients/testing/fixtures'
import { renderApp } from '@/test/renderApp'
import type {
  CartillaDetalleResponse,
  CategoriaActualizacionRequest,
  CategoriaRegistroRequest,
  ItemCartillaActualizacionRequest,
  ItemCartillaRegistroRequest,
  PictogramaGlobalResponse,
} from '../apiTypes'
import { boardDetailResponse, BOARD_ID, PATIENT_ID } from '../testing/fixtures'

const url = `/pacientes/${PATIENT_ID}/cartillas/${BOARD_ID}/editor`
const boardPath = `/api/pacientes/${PATIENT_ID}/cartillas/${BOARD_ID}`
const categoriesPath = `${boardPath}/categorias`
const categoryPath = (categoryId: string) => `${categoriesPath}/${categoryId}`
const itemsPath = (categoryId: string) => `${categoryPath(categoryId)}/items`
const itemPath = (categoryId: string, itemId: string) => `${itemsPath(categoryId)}/${itemId}`
const LIBRARY_PATH = '/api/pictogramas-globales'

const libraryRow = (id: string, etiqueta: string, arasaacId: number): PictogramaGlobalResponse => ({
  id,
  etiqueta,
  imagenUrl: `https://static.arasaac.org/pictograms/${arasaacId}/${arasaacId}_300.png`,
  arasaacId,
  creadoEn: '2026-01-01T09:00:00',
})

function networkError() {
  return new AxiosError('Network Error', 'ERR_NETWORK')
}

interface Controls {
  failCategoryPost: boolean
  /** Category ids whose PUT fails. */
  failCategoryPut: Set<string>
  failCategoryDelete: boolean
  failBoardGet: boolean
  /** When set, the category POST waits for it before answering. */
  categoryPostGate: Promise<void> | null
}

/**
 * Fake backend: category POST appends at `max(orden)+1` (0 when empty), PUT replaces name and color and
 * sets `orden` only when sent, DELETE removes the category WITH its items (cascade) and does not renumber.
 * Item POST/PUT/DELETE and the board GET work on the same state.
 */
function setupApi(mutate?: (detail: CartillaDetalleResponse) => void) {
  const server: CartillaDetalleResponse = structuredClone(boardDetailResponse)
  mutate?.(server)
  const library = [libraryRow('lib-agua', 'agua', 32464), libraryRow('lib-manzana', 'manzana', 2462)]
  const controls: Controls = {
    failCategoryPost: false,
    failCategoryPut: new Set(),
    failCategoryDelete: false,
    failBoardGet: false,
    categoryPostGate: null,
  }
  let counter = 0

  const post = vi.spyOn(api, 'post').mockImplementation(async (requestUrl: string, body?: unknown) => {
    if (requestUrl === categoriesPath) {
      if (controls.categoryPostGate) await controls.categoryPostGate
      if (controls.failCategoryPost) throw networkError()
      const request = body as CategoriaRegistroRequest
      counter += 1
      const id = `new-cat-${counter}`
      server.categorias.push({
        id,
        nombre: request.nombre,
        colorHex: request.colorHex,
        orden: request.orden ?? Math.max(-1, ...server.categorias.map((category) => category.orden)) + 1,
        items: [],
      })
      return { data: { id } }
    }
    const category = server.categorias.find((candidate) => requestUrl === itemsPath(candidate.id))
    if (category) {
      const request = body as ItemCartillaRegistroRequest
      counter += 1
      const id = `new-item-${counter}`
      const real = library.find((row) => row.id === request.recursoGlobalId)
      category.items.push({
        id,
        textoHablado: request.textoHablado,
        ordenVisual: Math.max(-1, ...category.items.map((item) => item.ordenVisual)) + 1,
        pictograma: real
          ? { id: real.id, etiqueta: real.etiqueta, imagenUrl: real.imagenUrl, tipo: 'GLOBAL' }
          : { id: 'x', etiqueta: 'x', imagenUrl: 'https://cdn.example.com/x.png', tipo: 'GLOBAL' },
        esCore: false,
        textoVisible: request.textoVisible ?? '',
        visibleEnModoUso: request.visibleEnModoUso ?? true,
      })
      return { data: { id } }
    }
    throw new Error(`Unexpected POST ${requestUrl}`)
  })
  const put = vi.spyOn(api, 'put').mockImplementation(async (requestUrl: string, body?: unknown) => {
    const category = server.categorias.find((candidate) => requestUrl === categoryPath(candidate.id))
    if (category) {
      if (controls.failCategoryPut.has(category.id)) throw networkError()
      const request = body as CategoriaActualizacionRequest
      category.nombre = request.nombre
      category.colorHex = request.colorHex
      if (request.orden !== undefined && request.orden !== null) category.orden = request.orden
      return { data: { id: category.id } }
    }
    const item = server.categorias.flatMap((c) => c.items).find((i) => requestUrl.endsWith(`/items/${i.id}`))
    if (!item) throw new Error(`Unexpected PUT ${requestUrl}`)
    const request = body as ItemCartillaActualizacionRequest
    item.textoVisible = request.textoVisible ?? item.textoVisible
    item.textoHablado = request.textoHablado
    return { data: { id: item.id } }
  })
  const del = vi.spyOn(api, 'delete').mockImplementation(async (requestUrl: string) => {
    const category = server.categorias.find((candidate) => requestUrl === categoryPath(candidate.id))
    if (!category) throw new Error(`Unexpected DELETE ${requestUrl}`)
    if (controls.failCategoryDelete) throw networkError()
    server.categorias = server.categorias.filter((candidate) => candidate.id !== category.id)
    return { data: undefined }
  })
  const patch = vi.spyOn(api, 'patch')
  const get = vi.spyOn(api, 'get').mockImplementation(async (requestUrl: string) => {
    if (requestUrl === '/api/usuarios/me') return { data: therapist }
    if (requestUrl === `/api/pacientes/${PATIENT_ID}`) return { data: therapistPatientsResponse[0] }
    if (requestUrl === LIBRARY_PATH) return { data: structuredClone(library) }
    if (requestUrl === boardPath) {
      if (controls.failBoardGet) throw networkError()
      return { data: structuredClone(server) }
    }
    throw new Error(`Unexpected GET ${requestUrl}`)
  })
  const boardGets = () => get.mock.calls.filter(([requestUrl]) => requestUrl === boardPath).length
  const categoryPuts = () => put.mock.calls.filter(([requestUrl]) => !requestUrl.includes('/items/'))
  return { server, controls, post, put, del, patch, get, boardGets, categoryPuts }
}

async function openEditor() {
  renderApp(url)
  await screen.findByRole('heading', { name: 'Tomás Pérez' })
  await waitFor(() => expect(screen.queryByText('Cargando pictogramas…')).not.toBeInTheDocument())
}

const saveButton = () => screen.getByRole('button', { name: /Guardar cambios|Guardando…/ })
const labelInput = () => screen.getByLabelText('Texto visible')
const addButton = () => screen.getByRole('button', { name: 'Agregar tarjeta' })
const newCategoryButton = () => screen.getByRole('button', { name: 'Nueva categoría' })
const rows = () => screen.getAllByTestId('board-item')
const headers = () => screen.queryAllByTestId('category-header')
const headerNames = () => headers().map((header) => header.getAttribute('aria-label'))
const header = (name: string) => screen.getByRole('group', { name: `Categoría ${name}` })
const headerButton = (action: string, name: string) => screen.getByRole('button', { name: `${action} ${name}` })
const rowLabels = () => rows().map((row) => row.querySelector('.uppercase')?.textContent)
const newCategoryInput = () => screen.getByRole('textbox', { name: 'Nombre de la nueva categoría' })
const renameInput = () => screen.getByRole('textbox', { name: 'Nombre de la categoría' })
const deleteConfirmation = () => screen.getByRole('group', { name: 'Confirmar eliminación de categoría' })

async function selectRow(index: number) {
  await userEvent.click(within(rows()[index]).getAllByRole('button')[0])
}

async function createCategoryNamed(name: string) {
  await userEvent.click(newCategoryButton())
  fireEvent.change(newCategoryInput(), { target: { value: name } })
  await userEvent.click(screen.getByRole('button', { name: 'Crear categoría' }))
}

const withEmptyCategory = (detail: CartillaDetalleResponse) => {
  detail.categorias.push({ id: 'cat-empty', nombre: 'Vacía', colorHex: '#999999', orden: 2, items: [] })
}

describe('BoardEditorPage category headers', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows one header per category in order with position, name, card count and hidden count', async () => {
    setupApi()
    await openEditor()

    expect(headerNames()).toEqual(['Categoría Necesidades', 'Categoría Acciones'])
    expect(header('Necesidades')).toHaveTextContent('1')
    expect(header('Necesidades')).toHaveTextContent('Necesidades')
    expect(header('Necesidades')).toHaveTextContent('3 tarjetas · 1 oculta')
    expect(header('Acciones')).toHaveTextContent('2')
    expect(header('Acciones')).toHaveTextContent('2 tarjetas')
    expect(header('Acciones')).not.toHaveTextContent('oculta')
    // Headers are not card rows.
    expect(rows()).toHaveLength(5)
    expect(rowLabels()).toEqual(['Hambre', 'Baño', 'Sed', 'Ayuda', 'Jugar'])
  })

  it('counts the draft cards: a hidden card toggled locally changes the counts', async () => {
    setupApi()
    await openEditor()

    await selectRow(2)
    await userEvent.click(screen.getByRole('switch', { name: 'Mostrar en el Modo Uso' }))

    expect(header('Necesidades')).toHaveTextContent('3 tarjetas')
    expect(header('Necesidades')).not.toHaveTextContent('oculta')
  })

  it('highlights the header of the selected card category and follows the selection', async () => {
    setupApi()
    await openEditor()

    expect(header('Necesidades')).toHaveAttribute('aria-current', 'true')
    expect(header('Acciones')).not.toHaveAttribute('aria-current')

    await selectRow(4)

    expect(header('Acciones')).toHaveAttribute('aria-current', 'true')
    expect(header('Necesidades')).not.toHaveAttribute('aria-current')
  })

  it('shows "Sin tarjetas" under an empty category', async () => {
    setupApi(withEmptyCategory)
    await openEditor()

    expect(headerNames()).toEqual(['Categoría Necesidades', 'Categoría Acciones', 'Categoría Vacía'])
    expect(header('Vacía')).toHaveTextContent('0 tarjetas')
    expect(screen.getByText('Sin tarjetas')).toBeInTheDocument()
    expect(rows()).toHaveLength(5)
  })

  it('makes the header highlight follow the new-card form category while it is open', async () => {
    setupApi()
    await openEditor()

    await userEvent.click(headerButton('Agregar tarjeta en', 'Acciones'))

    expect(await screen.findByRole('heading', { name: 'Nueva tarjeta' })).toBeInTheDocument()
    expect(header('Acciones')).toHaveAttribute('aria-current', 'true')
    expect(header('Necesidades')).not.toHaveAttribute('aria-current')
  })
})

describe('BoardEditorPage creating categories', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates a category with the trimmed name, the default color and no orden, and shows it last and empty', async () => {
    const fake = setupApi()
    await openEditor()
    expect(fake.boardGets()).toBe(1)

    await userEvent.click(newCategoryButton())
    const input = newCategoryInput()
    expect(input).toHaveAttribute('maxlength', '100')
    expect(screen.getByRole('button', { name: 'Crear categoría' })).toBeDisabled()
    fireEvent.change(input, { target: { value: '  Lugares ' } })
    await userEvent.click(screen.getByRole('button', { name: 'Crear categoría' }))

    expect(await screen.findByText('Categoría creada.')).toBeInTheDocument()
    expect(fake.post).toHaveBeenCalledExactlyOnceWith(categoriesPath, { nombre: 'Lugares', colorHex: '#E0E0E0' })
    expect(fake.post.mock.calls[0][1]).not.toHaveProperty('orden')
    expect(fake.boardGets()).toBe(2)
    expect(headerNames()).toEqual(['Categoría Necesidades', 'Categoría Acciones', 'Categoría Lugares'])
    expect(header('Lugares')).toHaveTextContent('3')
    expect(screen.getByText('Sin tarjetas')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Nombre de la nueva categoría' })).not.toBeInTheDocument()
    expect(fake.put).not.toHaveBeenCalled()
    expect(fake.del).not.toHaveBeenCalled()
    expect(fake.patch).not.toHaveBeenCalled()
  })

  it('enables "Agregar tarjeta" once the first category exists and updates the note', async () => {
    setupApi((detail) => {
      detail.categorias = []
    })
    await openEditor()

    expect(headers()).toHaveLength(0)
    expect(addButton()).toBeDisabled()
    expect(newCategoryButton()).toBeEnabled()
    expect(
      screen.getByText('Esta cartilla no tiene categorías. Crea una con «Nueva categoría» para poder agregar tarjetas.'),
    ).toBeInTheDocument()

    await createCategoryNamed('Primera')

    expect(await screen.findByText('Categoría creada.')).toBeInTheDocument()
    expect(headerNames()).toEqual(['Categoría Primera'])
    expect(addButton()).toBeEnabled()
    expect(screen.queryByText(/Esta cartilla no tiene categorías/)).not.toBeInTheDocument()
  })

  it('offers the new category in the new-card form', async () => {
    setupApi()
    await openEditor()
    await createCategoryNamed('Lugares')
    expect(await screen.findByText('Categoría creada.')).toBeInTheDocument()

    await userEvent.click(addButton())

    const select = await screen.findByLabelText('Categoría')
    expect(within(select).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Necesidades',
      'Acciones',
      'Lugares',
    ])
  })

  it('validates only after the field was touched and keeps Create disabled while invalid', async () => {
    const fake = setupApi()
    await openEditor()
    await userEvent.click(newCategoryButton())

    expect(screen.queryByText('El nombre es obligatorio.')).not.toBeInTheDocument()
    expect(newCategoryInput()).not.toHaveAttribute('aria-invalid')

    fireEvent.blur(newCategoryInput())
    expect(screen.getByText('El nombre es obligatorio.')).toBeInTheDocument()
    expect(newCategoryInput()).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('button', { name: 'Crear categoría' })).toBeDisabled()

    fireEvent.change(newCategoryInput(), { target: { value: '   ' } })
    expect(screen.getByText('El nombre es obligatorio.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Crear categoría' })).toBeDisabled()

    fireEvent.change(newCategoryInput(), { target: { value: 'x'.repeat(101) } })
    expect(screen.getByText('Máximo 100 caracteres.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Crear categoría' })).toBeDisabled()

    fireEvent.change(newCategoryInput(), { target: { value: 'Lugares' } })
    expect(screen.queryByText(/obligatorio|Máximo/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Crear categoría' })).toBeEnabled()
    expect(fake.post).not.toHaveBeenCalled()
  })

  it('closes the form with Cancelar without sending anything', async () => {
    const fake = setupApi()
    await openEditor()
    await userEvent.click(newCategoryButton())
    fireEvent.change(newCategoryInput(), { target: { value: 'Lugares' } })

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('textbox', { name: 'Nombre de la nueva categoría' })).not.toBeInTheDocument()
    expect(fake.post).not.toHaveBeenCalled()
  })

  it('keeps the typed name and shows an alert when the creation fails, then allows retrying', async () => {
    const fake = setupApi()
    fake.controls.failCategoryPost = true
    await openEditor()

    await createCategoryNamed('Lugares')

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo conectar con el servidor.')
    expect(newCategoryInput()).toHaveValue('Lugares')
    expect(headers()).toHaveLength(2)
    expect(screen.queryByText('Categoría creada.')).not.toBeInTheDocument()

    fake.controls.failCategoryPost = false
    await userEvent.click(screen.getByRole('button', { name: 'Crear categoría' }))

    expect(await screen.findByText('Categoría creada.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(headerNames()).toEqual(['Categoría Necesidades', 'Categoría Acciones', 'Categoría Lugares'])
  })

  it('locks the editor and shows progress while the category is being created', async () => {
    let release: () => void = () => {}
    const fake = setupApi()
    fake.controls.categoryPostGate = new Promise<void>((resolve) => {
      release = resolve
    })
    await openEditor()

    await createCategoryNamed('Lugares')

    expect(await screen.findByRole('button', { name: 'Creando…' })).toBeDisabled()
    expect(document.querySelector('main')).toHaveAttribute('inert')
    expect(saveButton()).toBeDisabled()

    release()
    expect(await screen.findByText('Categoría creada.')).toBeInTheDocument()
    expect(document.querySelector('main')).not.toHaveAttribute('inert')
  })

  it('closes the create form and shows the reload message when the category was created but the reload fails', async () => {
    const fake = setupApi()
    await openEditor()
    fake.controls.failBoardGet = true

    await createCategoryNamed('Lugares')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El cambio se guardó, pero no se pudo recargar la cartilla. Recarga la página.',
    )
    expect(screen.queryByRole('textbox', { name: 'Nombre de la nueva categoría' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Crear categoría' })).not.toBeInTheDocument()
    expect(newCategoryButton()).toBeEnabled()

    // Even trying again never repeats the same creation: the form is empty and needs a new name.
    await userEvent.click(newCategoryButton())
    expect(newCategoryInput()).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Crear categoría' })).toBeDisabled()
    expect(fake.post).toHaveBeenCalledTimes(1)
    expect(fake.server.categorias.filter((category) => category.nombre === 'Lugares')).toHaveLength(1)
  })

  it('closes the delete confirmation and shows the reload message when the category was deleted but the reload fails', async () => {
    const fake = setupApi()
    await openEditor()
    fake.controls.failBoardGet = true

    await userEvent.click(headerButton('Eliminar', 'Acciones'))
    await userEvent.click(within(deleteConfirmation()).getByRole('button', { name: 'Sí, eliminar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('El cambio se guardó, pero no se pudo recargar')
    expect(screen.queryByRole('group', { name: 'Confirmar eliminación de categoría' })).not.toBeInTheDocument()
    expect(fake.del).toHaveBeenCalledTimes(1)
  })
})

describe('BoardEditorPage renaming categories', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renames with a PUT that resends the current color and no orden', async () => {
    const fake = setupApi()
    await openEditor()

    await userEvent.click(headerButton('Renombrar', 'Acciones'))
    expect(renameInput()).toHaveValue('Acciones')
    expect(renameInput()).toHaveAttribute('maxlength', '100')
    fireEvent.change(renameInput(), { target: { value: '  Verbos ' } })
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Categoría renombrada.')).toBeInTheDocument()
    expect(fake.put).toHaveBeenCalledExactlyOnceWith(categoryPath('cat-b'), { nombre: 'Verbos', colorHex: '#22AA55' })
    expect(fake.put.mock.calls[0][1]).not.toHaveProperty('orden')
    expect(headerNames()).toEqual(['Categoría Necesidades', 'Categoría Verbos'])
    expect(screen.queryByRole('textbox', { name: 'Nombre de la categoría' })).not.toBeInTheDocument()
    expect(fake.post).not.toHaveBeenCalled()
  })

  it('submits with Enter and cancels with Escape without sending anything', async () => {
    const fake = setupApi()
    await openEditor()

    await userEvent.click(headerButton('Renombrar', 'Acciones'))
    await userEvent.type(renameInput(), 'X{Escape}')

    expect(screen.queryByRole('textbox', { name: 'Nombre de la categoría' })).not.toBeInTheDocument()
    expect(headerNames()).toEqual(['Categoría Necesidades', 'Categoría Acciones'])
    expect(fake.put).not.toHaveBeenCalled()

    await userEvent.click(headerButton('Renombrar', 'Acciones'))
    await userEvent.type(renameInput(), 'X{Enter}')

    expect(await screen.findByText('Categoría renombrada.')).toBeInTheDocument()
    expect(fake.put).toHaveBeenCalledExactlyOnceWith(categoryPath('cat-b'), { nombre: 'AccionesX', colorHex: '#22AA55' })
  })

  it('shows the validation only after touching, and disables Guardar while invalid or unchanged', async () => {
    const fake = setupApi()
    await openEditor()
    await userEvent.click(headerButton('Renombrar', 'Acciones'))

    expect(screen.queryByText('El nombre es obligatorio.')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled()

    fireEvent.change(renameInput(), { target: { value: '  ' } })
    expect(screen.getByText('El nombre es obligatorio.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled()

    fireEvent.change(renameInput(), { target: { value: 'Verbos' } })
    expect(screen.queryByText('El nombre es obligatorio.')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeEnabled()
    expect(fake.put).not.toHaveBeenCalled()
  })

  it('keeps the typed text and shows an alert when the rename fails, then allows retrying', async () => {
    const fake = setupApi()
    fake.controls.failCategoryPut.add('cat-b')
    await openEditor()
    await userEvent.click(headerButton('Renombrar', 'Acciones'))
    fireEvent.change(renameInput(), { target: { value: 'Verbos' } })

    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo conectar con el servidor.')
    expect(renameInput()).toHaveValue('Verbos')
    expect(headerNames()).toEqual(['Categoría Necesidades', 'Categoría Acciones'])
    expect(screen.queryByText('Categoría renombrada.')).not.toBeInTheDocument()

    fake.controls.failCategoryPut.clear()
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Categoría renombrada.')).toBeInTheDocument()
    expect(headerNames()).toEqual(['Categoría Necesidades', 'Categoría Verbos'])
  })
})

describe('BoardEditorPage moving categories', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('disables Subir on the first and Bajar on the last category', async () => {
    setupApi()
    await openEditor()

    expect(headerButton('Subir', 'Necesidades')).toBeDisabled()
    expect(headerButton('Bajar', 'Necesidades')).toBeEnabled()
    expect(headerButton('Subir', 'Acciones')).toBeEnabled()
    expect(headerButton('Bajar', 'Acciones')).toBeDisabled()
  })

  it('swaps the orden values with two PUTs and moves the cards with their category', async () => {
    const fake = setupApi()
    await openEditor()

    await userEvent.click(headerButton('Bajar', 'Necesidades'))

    expect(await screen.findByText('Categoría movida.')).toBeInTheDocument()
    expect(fake.categoryPuts()).toHaveLength(2)
    expect(fake.put).toHaveBeenCalledWith(categoryPath('cat-a'), { nombre: 'Necesidades', colorHex: '#3366FF', orden: 1 })
    expect(fake.put).toHaveBeenCalledWith(categoryPath('cat-b'), { nombre: 'Acciones', colorHex: '#22AA55', orden: 0 })
    expect(headerNames()).toEqual(['Categoría Acciones', 'Categoría Necesidades'])
    expect(rowLabels()).toEqual(['Ayuda', 'Jugar', 'Hambre', 'Baño', 'Sed'])
    expect(rows().map((row) => row.querySelector('button span')?.textContent)).toEqual(['1', '2', '3', '4', '5'])
    expect(fake.boardGets()).toBe(2)
    expect(headerButton('Subir', 'Acciones')).toBeDisabled()
    expect(headerButton('Bajar', 'Necesidades')).toBeDisabled()
    expect(fake.patch).not.toHaveBeenCalled()
  })

  it('moves up too, keeping the selected card selected', async () => {
    const fake = setupApi()
    await openEditor()
    await selectRow(4)

    await userEvent.click(headerButton('Subir', 'Acciones'))

    expect(await screen.findByText('Categoría movida.')).toBeInTheDocument()
    expect(headerNames()).toEqual(['Categoría Acciones', 'Categoría Necesidades'])
    expect(labelInput()).toHaveValue('Jugar')
    expect(header('Acciones')).toHaveAttribute('aria-current', 'true')
    expect(fake.categoryPuts()).toHaveLength(2)
  })

  it('renumbers 0..n-1 on a tie and sends only the values that change', async () => {
    const fake = setupApi((detail) => {
      // Server order of the tie: Acciones, Necesidades, Lugares (all orden 0).
      detail.categorias.forEach((category) => {
        category.orden = 0
      })
      detail.categorias.push({ id: 'cat-c', nombre: 'Lugares', colorHex: '#000000', orden: 0, items: [] })
    })
    await openEditor()
    expect(headerNames()).toEqual(['Categoría Acciones', 'Categoría Necesidades', 'Categoría Lugares'])

    await userEvent.click(headerButton('Subir', 'Lugares'))

    expect(await screen.findByText('Categoría movida.')).toBeInTheDocument()
    expect(fake.categoryPuts()).toHaveLength(2)
    expect(fake.put).toHaveBeenCalledWith(categoryPath('cat-c'), { nombre: 'Lugares', colorHex: '#000000', orden: 1 })
    expect(fake.put).toHaveBeenCalledWith(categoryPath('cat-a'), { nombre: 'Necesidades', colorHex: '#3366FF', orden: 2 })
    expect(headerNames()).toEqual(['Categoría Acciones', 'Categoría Lugares', 'Categoría Necesidades'])
  })

  it('shows the error under the header and applies the server truth when one PUT fails', async () => {
    const fake = setupApi()
    fake.controls.failCategoryPut.add('cat-a')
    await openEditor()

    await userEvent.click(headerButton('Bajar', 'Necesidades'))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo mover la categoría. No se pudo conectar con el servidor.',
    )
    expect(fake.categoryPuts()).toHaveLength(2)
    expect(fake.boardGets()).toBe(2)
    // The PUT that succeeded is reflected: both categories now tie at 0, in the server's array order.
    expect(headerNames()).toEqual(['Categoría Acciones', 'Categoría Necesidades'])
    expect(screen.queryByText('Categoría movida.')).not.toBeInTheDocument()
  })
})

describe('BoardEditorPage deleting categories', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('deletes an empty category after confirming, saying it has no cards', async () => {
    const fake = setupApi(withEmptyCategory)
    await openEditor()

    await userEvent.click(headerButton('Eliminar', 'Vacía'))

    expect(deleteConfirmation()).toHaveTextContent('¿Eliminar la categoría «Vacía»?')
    expect(deleteConfirmation()).toHaveTextContent('La categoría no tiene tarjetas.')
    expect(deleteConfirmation()).toHaveTextContent('No se puede deshacer.')
    expect(deleteConfirmation()).not.toHaveTextContent('Se perderán')
    expect(fake.del).not.toHaveBeenCalled()

    await userEvent.click(within(deleteConfirmation()).getByRole('button', { name: 'Sí, eliminar' }))

    expect(await screen.findByText('Categoría eliminada.')).toBeInTheDocument()
    expect(fake.del).toHaveBeenCalledExactlyOnceWith(categoryPath('cat-empty'))
    expect(headerNames()).toEqual(['Categoría Necesidades', 'Categoría Acciones'])
    expect(rows()).toHaveLength(5)
    expect(screen.queryByRole('group', { name: 'Confirmar eliminación de categoría' })).not.toBeInTheDocument()
  })

  it('states the number of cards and hidden ones, and sends nothing when cancelled', async () => {
    const fake = setupApi()
    await openEditor()

    await userEvent.click(headerButton('Eliminar', 'Necesidades'))

    expect(deleteConfirmation()).toHaveTextContent('¿Eliminar la categoría «Necesidades»?')
    expect(deleteConfirmation()).toHaveTextContent('También se eliminarán sus 3 tarjetas (1 oculta) de forma permanente.')
    expect(deleteConfirmation()).toHaveTextContent('No se puede deshacer.')
    expect(deleteConfirmation()).not.toHaveTextContent('Se perderán')

    await userEvent.click(within(deleteConfirmation()).getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('group', { name: 'Confirmar eliminación de categoría' })).not.toBeInTheDocument()
    expect(fake.del).not.toHaveBeenCalled()
    expect(rows()).toHaveLength(5)

    await userEvent.click(headerButton('Eliminar', 'Acciones'))
    expect(deleteConfirmation()).toHaveTextContent('También se eliminarán sus 2 tarjetas de forma permanente.')
  })

  it('deletes the category and its cards, selecting the first remaining card', async () => {
    const fake = setupApi()
    await openEditor()
    expect(within(screen.getByTestId('board-preview')).getByText('Hambre')).toBeInTheDocument()

    await userEvent.click(headerButton('Eliminar', 'Necesidades'))
    await userEvent.click(within(deleteConfirmation()).getByRole('button', { name: 'Sí, eliminar' }))

    expect(await screen.findByText('Categoría eliminada.')).toBeInTheDocument()
    expect(fake.del).toHaveBeenCalledExactlyOnceWith(categoryPath('cat-a'))
    expect(fake.boardGets()).toBe(2)
    expect(headerNames()).toEqual(['Categoría Acciones'])
    expect(rowLabels()).toEqual(['Ayuda', 'Jugar'])
    expect(screen.queryByText('Hambre')).not.toBeInTheDocument()
    expect(within(screen.getByTestId('board-preview')).queryByText('Hambre')).not.toBeInTheDocument()
    expect(labelInput()).toHaveValue('Ayuda')
    expect(screen.getByText('2 de 12')).toBeInTheDocument()
    expect(fake.patch).not.toHaveBeenCalled()
  })

  it('keeps pending edits of other cards and warns about unsaved edits of the deleted ones', async () => {
    const fake = setupApi()
    await openEditor()
    fireEvent.change(labelInput(), { target: { value: 'Comida' } })
    await selectRow(4)
    fireEvent.change(labelInput(), { target: { value: 'Juego' } })

    await userEvent.click(headerButton('Eliminar', 'Necesidades'))
    expect(deleteConfirmation()).toHaveTextContent('Se perderán también los cambios sin guardar de esas tarjetas.')
    await userEvent.click(within(deleteConfirmation()).getByRole('button', { name: 'Sí, eliminar' }))

    expect(await screen.findByText('Categoría eliminada.')).toBeInTheDocument()
    expect(rowLabels()).toEqual(['Ayuda', 'Juego'])
    expect(screen.getByText('Cambios sin guardar')).toBeInTheDocument()

    await userEvent.click(saveButton())

    expect(await screen.findByText('Cambios guardados.')).toBeInTheDocument()
    expect(fake.put).toHaveBeenCalledExactlyOnceWith(
      itemPath('cat-b', 'item-b2'),
      expect.objectContaining({ textoVisible: 'Juego' }),
    )
  })

  it('does not warn about unsaved edits when the edited card belongs to another category', async () => {
    setupApi()
    await openEditor()
    await selectRow(4)
    fireEvent.change(labelInput(), { target: { value: 'Juego' } })

    await userEvent.click(headerButton('Eliminar', 'Necesidades'))

    expect(deleteConfirmation()).not.toHaveTextContent('Se perderán')
  })

  it('keeps everything and shows the error inside the confirmation when the deletion fails', async () => {
    const fake = setupApi()
    fake.controls.failCategoryDelete = true
    await openEditor()

    await userEvent.click(headerButton('Eliminar', 'Necesidades'))
    await userEvent.click(within(deleteConfirmation()).getByRole('button', { name: 'Sí, eliminar' }))

    expect(await within(deleteConfirmation()).findByRole('alert')).toHaveTextContent('No se pudo conectar con el servidor.')
    expect(headers()).toHaveLength(2)
    expect(rows()).toHaveLength(5)
    expect(screen.queryByText('Categoría eliminada.')).not.toBeInTheDocument()
    expect(within(deleteConfirmation()).getByRole('button', { name: 'Sí, eliminar' })).toBeEnabled()

    fake.controls.failCategoryDelete = false
    await userEvent.click(within(deleteConfirmation()).getByRole('button', { name: 'Sí, eliminar' }))

    expect(await screen.findByText('Categoría eliminada.')).toBeInTheDocument()
    expect(headers()).toHaveLength(1)
  })

  it('allows deleting the last category: Agregar tarjeta is disabled and the note explains how to continue', async () => {
    const fake = setupApi((detail) => {
      detail.categorias = detail.categorias.filter((category) => category.id === 'cat-b')
    })
    await openEditor()
    expect(addButton()).toBeEnabled()

    await userEvent.click(headerButton('Eliminar', 'Acciones'))
    await userEvent.click(within(deleteConfirmation()).getByRole('button', { name: 'Sí, eliminar' }))

    expect(await screen.findByText('Categoría eliminada.')).toBeInTheDocument()
    expect(fake.del).toHaveBeenCalledExactlyOnceWith(categoryPath('cat-b'))
    expect(headers()).toHaveLength(0)
    expect(screen.queryAllByTestId('board-item')).toHaveLength(0)
    expect(addButton()).toBeDisabled()
    expect(newCategoryButton()).toBeEnabled()
    expect(
      screen.getByText('Esta cartilla no tiene categorías. Crea una con «Nueva categoría» para poder agregar tarjetas.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Elegir una tarjeta de la lista o de la vista previa para editarla.')).toBeInTheDocument()
  })
})

describe('BoardEditorPage adding a card in a category', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('opens the new-card form with that category preselected and creates the card there', async () => {
    const fake = setupApi()
    await openEditor()

    await userEvent.click(headerButton('Agregar tarjeta en', 'Acciones'))

    expect(await screen.findByRole('heading', { name: 'Nueva tarjeta' })).toBeInTheDocument()
    expect(screen.getByLabelText('Categoría')).toHaveValue('cat-b')

    await userEvent.click(screen.getByRole('radio', { name: 'manzana' }))
    await userEvent.click(screen.getByRole('button', { name: 'Crear tarjeta' }))

    expect(await screen.findByText('Tarjeta creada.')).toBeInTheDocument()
    expect(fake.post).toHaveBeenCalledExactlyOnceWith(itemsPath('cat-b'), expect.objectContaining({ textoHablado: 'Manzana' }))
    expect(rowLabels()).toEqual(['Hambre', 'Baño', 'Sed', 'Ayuda', 'Jugar', 'Manzana'])
    expect(header('Acciones')).toHaveTextContent('3 tarjetas')
  })

  it('works on an empty category', async () => {
    const fake = setupApi(withEmptyCategory)
    await openEditor()

    await userEvent.click(headerButton('Agregar tarjeta en', 'Vacía'))
    expect(await screen.findByLabelText('Categoría')).toHaveValue('cat-empty')
    await userEvent.click(screen.getByRole('radio', { name: 'agua' }))
    await userEvent.click(screen.getByRole('button', { name: 'Crear tarjeta' }))

    expect(await screen.findByText('Tarjeta creada.')).toBeInTheDocument()
    expect(fake.post).toHaveBeenCalledExactlyOnceWith(itemsPath('cat-empty'), expect.anything())
    expect(screen.queryByText('Sin tarjetas')).not.toBeInTheDocument()
  })

  it('is disabled under the same conditions as "Agregar tarjeta" (12 cards)', async () => {
    setupApi((detail) => {
      for (let index = 0; index < 7; index++) {
        detail.categorias[1].items.push({
          id: `extra-${index}`,
          textoHablado: `Extra ${index}`,
          ordenVisual: 10 + index,
          pictograma: null,
          esCore: false,
          textoVisible: `Extra ${index}`,
          visibleEnModoUso: true,
        })
      }
    })
    await openEditor()

    expect(addButton()).toBeDisabled()
    expect(headerButton('Agregar tarjeta en', 'Necesidades')).toBeDisabled()
    expect(headerButton('Agregar tarjeta en', 'Acciones')).toBeDisabled()
  })
})

describe('BoardEditorPage inline category editors', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps only one editor open at a time', async () => {
    setupApi()
    await openEditor()

    await userEvent.click(newCategoryButton())
    expect(newCategoryInput()).toBeInTheDocument()

    await userEvent.click(headerButton('Renombrar', 'Acciones'))
    expect(screen.queryByRole('textbox', { name: 'Nombre de la nueva categoría' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('textbox', { name: /Nombre de la/ })).toHaveLength(1)
    expect(renameInput()).toHaveValue('Acciones')

    await userEvent.click(headerButton('Eliminar', 'Necesidades'))
    expect(screen.queryByRole('textbox', { name: 'Nombre de la categoría' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('group', { name: 'Confirmar eliminación de categoría' })).toHaveLength(1)

    await userEvent.click(headerButton('Renombrar', 'Necesidades'))
    expect(screen.queryByRole('group', { name: 'Confirmar eliminación de categoría' })).not.toBeInTheDocument()
    expect(renameInput()).toHaveValue('Necesidades')
  })

  it('closes the editor when the new-card form is opened', async () => {
    setupApi()
    await openEditor()
    await userEvent.click(headerButton('Renombrar', 'Acciones'))

    await userEvent.click(addButton())

    expect(await screen.findByRole('heading', { name: 'Nueva tarjeta' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Nombre de la categoría' })).not.toBeInTheDocument()
  })
})

describe('BoardEditorPage category navigation guard', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  const backLink = () => screen.getByRole('link', { name: 'Volver a las cartillas de Tomás' })
  const beforeUnload = () => {
    const event = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(event)
    return event.defaultPrevented
  }

  it('asks before leaving when a category name was typed in the create form', async () => {
    setupApi()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await openEditor()
    await userEvent.click(newCategoryButton())
    fireEvent.change(newCategoryInput(), { target: { value: 'Lugares' } })

    expect(beforeUnload()).toBe(true)
    await userEvent.click(backLink())

    expect(confirm).toHaveBeenCalledExactlyOnceWith(UNSAVED_CHANGES_MESSAGE)
    expect(screen.getByTestId('location')).toHaveTextContent(url)
  })

  it('asks before leaving when a rename was changed, and stops asking once cancelled', async () => {
    setupApi()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await openEditor()
    await userEvent.click(headerButton('Renombrar', 'Acciones'))
    fireEvent.change(renameInput(), { target: { value: 'Verbos' } })

    expect(beforeUnload()).toBe(true)
    await userEvent.click(backLink())
    expect(confirm).toHaveBeenCalledExactlyOnceWith(UNSAVED_CHANGES_MESSAGE)

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(beforeUnload()).toBe(false)
  })

  it('does not ask for an untouched create or rename editor, nor for a delete confirmation', async () => {
    setupApi()
    const confirm = vi.spyOn(window, 'confirm')
    await openEditor()

    await userEvent.click(newCategoryButton())
    expect(beforeUnload()).toBe(false)
    await userEvent.click(headerButton('Renombrar', 'Acciones'))
    expect(beforeUnload()).toBe(false)
    await userEvent.click(headerButton('Eliminar', 'Acciones'))
    expect(beforeUnload()).toBe(false)

    await userEvent.click(backLink())

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(`/pacientes/${PATIENT_ID}/cartillas`))
    expect(confirm).not.toHaveBeenCalled()
  })

  it('asks before logging out with a typed category name', async () => {
    const fake = setupApi()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await openEditor()
    await userEvent.click(newCategoryButton())
    fireEvent.change(newCategoryInput(), { target: { value: 'Lugares' } })
    fake.post.mockClear()

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    expect(confirm).toHaveBeenCalledExactlyOnceWith(UNSAVED_CHANGES_MESSAGE)
    expect(fake.post).not.toHaveBeenCalled()
  })
})

describe('BoardEditorPage preview category navigation', () => {
  const preview = () => screen.getByTestId('board-preview')
  const previewNav = () => within(preview()).getByRole('navigation', { name: 'Categorías' })

  it('shows only the first category by default, with a category button per real category', async () => {
    setupApi()
    await openEditor()

    expect(within(preview()).getByText('Hambre')).toBeInTheDocument()
    expect(within(preview()).getByText('Baño')).toBeInTheDocument()
    expect(within(preview()).queryByText('Ayuda')).not.toBeInTheDocument()
    expect(within(preview()).queryByText('Jugar')).not.toBeInTheDocument()
    expect(within(previewNav()).getAllByRole('button').map((b) => b.textContent)).toEqual(['Necesidades', 'Acciones'])
  })

  it('switching the preview category only changes what the preview shows, never the editor selection', async () => {
    setupApi()
    await openEditor()
    expect(labelInput()).toHaveValue('Hambre')

    await userEvent.click(within(previewNav()).getByRole('button', { name: 'Acciones' }))

    expect(within(preview()).getByText('Ayuda')).toBeInTheDocument()
    expect(within(preview()).getByText('Jugar')).toBeInTheDocument()
    expect(within(preview()).queryByText('Hambre')).not.toBeInTheDocument()
    // The right-hand editor panel keeps editing whatever was selected before — the preview's own
    // category switch is local and never drives the admin selection.
    expect(labelInput()).toHaveValue('Hambre')
  })

  it('tapping a card in the preview still selects it for editing, in any preview category', async () => {
    setupApi()
    await openEditor()

    await userEvent.click(within(previewNav()).getByRole('button', { name: 'Acciones' }))
    await userEvent.click(within(preview()).getByText('Jugar'))

    expect(labelInput()).toHaveValue('Jugar')
  })
})
