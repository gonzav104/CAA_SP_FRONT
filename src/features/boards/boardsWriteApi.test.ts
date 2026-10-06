import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import type { CartillaResponse } from './apiTypes'
import { createBoard, deleteBoard, renameBoard, setPrimaryBoard } from './boardsWriteApi'

const response: CartillaResponse = {
  id: 'c/1',
  pacienteId: 'p 1',
  creadorId: 'u-1',
  nombre: 'Casa',
  esPrincipal: false,
  creadoEn: '2026-02-01T09:00:00',
}

const BASE = '/api/pacientes/p%201/cartillas'

function spyOthers() {
  return { patch: vi.spyOn(api, 'patch'), get: vi.spyOn(api, 'get') }
}

describe('createBoard', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('issues a single POST with only nombre and returns the response data', async () => {
    const others = spyOthers()
    const put = vi.spyOn(api, 'put')
    const del = vi.spyOn(api, 'delete')
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: response })

    await expect(createBoard('p 1', { nombre: 'Casa' })).resolves.toBe(response)

    expect(post).toHaveBeenCalledExactlyOnceWith(BASE, { nombre: 'Casa' })
    expect(Object.keys(post.mock.calls[0][1] as object)).toEqual(['nombre'])
    expect(put).not.toHaveBeenCalled()
    expect(del).not.toHaveBeenCalled()
    expect(others.patch).not.toHaveBeenCalled()
    expect(others.get).not.toHaveBeenCalled()
  })

  it('propagates request errors', async () => {
    vi.spyOn(api, 'post').mockRejectedValue(new Error('boom'))
    await expect(createBoard('p', { nombre: 'x' })).rejects.toThrow('boom')
  })
})

describe('renameBoard', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('issues a single PUT with encoded ids and only nombre', async () => {
    const others = spyOthers()
    const post = vi.spyOn(api, 'post')
    const del = vi.spyOn(api, 'delete')
    const put = vi.spyOn(api, 'put').mockResolvedValue({ data: response })

    await expect(renameBoard('p 1', 'c/1', { nombre: 'Escuela' })).resolves.toBe(response)

    expect(put).toHaveBeenCalledExactlyOnceWith(`${BASE}/c%2F1`, { nombre: 'Escuela' })
    const body = put.mock.calls[0][1] as object
    expect(Object.keys(body)).toEqual(['nombre'])
    expect(body).not.toHaveProperty('esPrincipal')
    expect(body).not.toHaveProperty('paradigma')
    expect(post).not.toHaveBeenCalled()
    expect(del).not.toHaveBeenCalled()
    expect(others.patch).not.toHaveBeenCalled()
  })

  it('propagates request errors', async () => {
    vi.spyOn(api, 'put').mockRejectedValue(new Error('boom'))
    await expect(renameBoard('p', 'c', { nombre: 'x' })).rejects.toThrow('boom')
  })
})

describe('setPrimaryBoard', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('issues a single PUT to /principal with encoded ids and NO body', async () => {
    const others = spyOthers()
    const post = vi.spyOn(api, 'post')
    const del = vi.spyOn(api, 'delete')
    const put = vi.spyOn(api, 'put').mockResolvedValue({ data: { ...response, esPrincipal: true } })

    await expect(setPrimaryBoard('p 1', 'c/1')).resolves.toEqual({ ...response, esPrincipal: true })

    expect(put).toHaveBeenCalledExactlyOnceWith(`${BASE}/c%2F1/principal`)
    expect(put.mock.calls[0]).toHaveLength(1)
    expect(post).not.toHaveBeenCalled()
    expect(del).not.toHaveBeenCalled()
    expect(others.patch).not.toHaveBeenCalled()
  })

  it('propagates request errors', async () => {
    vi.spyOn(api, 'put').mockRejectedValue(new Error('boom'))
    await expect(setPrimaryBoard('p', 'c')).rejects.toThrow('boom')
  })
})

describe('deleteBoard', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('issues a single DELETE with encoded ids and no body', async () => {
    const others = spyOthers()
    const post = vi.spyOn(api, 'post')
    const put = vi.spyOn(api, 'put')
    const del = vi.spyOn(api, 'delete').mockResolvedValue({ data: undefined })

    await expect(deleteBoard('p 1', 'c/1')).resolves.toBeUndefined()

    expect(del).toHaveBeenCalledExactlyOnceWith(`${BASE}/c%2F1`)
    expect(post).not.toHaveBeenCalled()
    expect(put).not.toHaveBeenCalled()
    expect(others.patch).not.toHaveBeenCalled()
  })

  it('propagates request errors', async () => {
    vi.spyOn(api, 'delete').mockRejectedValue(new Error('boom'))
    await expect(deleteBoard('p', 'c')).rejects.toThrow('boom')
  })
})
