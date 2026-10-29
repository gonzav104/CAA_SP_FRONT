import { AxiosError } from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import { fetchCurrentUser, login, logout, register, requestPasswordReset, resetPassword } from './authApi'
import type { CurrentUser } from './types'

const user: CurrentUser = {
  id: '3f0c8a52-6a53-4b86-9f7e-0b5b3c3f2f10',
  email: 'ana@example.com',
  nombre: 'Ana',
  creadoEn: '2026-01-01T10:00:00',
}

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

describe('authApi', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetchCurrentUser returns the user on 200', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: user })
    await expect(fetchCurrentUser()).resolves.toEqual(user)
    expect(api.get).toHaveBeenCalledWith('/api/usuarios/me')
  })

  it('fetchCurrentUser returns null on 401', async () => {
    vi.spyOn(api, 'get').mockRejectedValue(httpError(401))
    await expect(fetchCurrentUser()).resolves.toBeNull()
  })

  it('fetchCurrentUser rethrows on 500', async () => {
    const error = httpError(500)
    vi.spyOn(api, 'get').mockRejectedValue(error)
    await expect(fetchCurrentUser()).rejects.toBe(error)
  })

  it('fetchCurrentUser rethrows on network error', async () => {
    const error = new AxiosError('Network Error', 'ERR_NETWORK')
    vi.spyOn(api, 'get').mockRejectedValue(error)
    await expect(fetchCurrentUser()).rejects.toBe(error)
  })

  it('login posts the credentials to /auth/login', async () => {
    vi.spyOn(api, 'post').mockResolvedValue({ data: { token: null, tipo: 'Bearer' } })
    const credentials = { email: 'ana@example.com', password: 'secret' }
    await expect(login(credentials)).resolves.toEqual({ token: null, tipo: 'Bearer' })
    expect(api.post).toHaveBeenCalledWith('/auth/login', credentials)
  })

  it('logout posts to /auth/logout', async () => {
    vi.spyOn(api, 'post').mockResolvedValue({ data: undefined })
    await logout()
    expect(api.post).toHaveBeenCalledWith('/auth/logout')
  })

  it('register POSTs identity only to /api/usuarios/registro', async () => {
    const request = { nombre: 'Ana', email: 'ana@example.com', password: 'Segura#2026' }
    const post = vi.spyOn(api, 'post').mockResolvedValue({ status: 201, data: user })
    await expect(register(request)).resolves.toBe(user)
    expect(post).toHaveBeenCalledExactlyOnceWith('/api/usuarios/registro', request)
  })

  it('requestPasswordReset and resetPassword send the real bodies, the token never in the URL', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { message: 'ok' } })
    await requestPasswordReset('ana@example.com')
    await resetPassword({ token: 'tok', password: 'Segura#2026' })
    expect(post).toHaveBeenNthCalledWith(1, '/auth/olvide-password', { email: 'ana@example.com' })
    expect(post).toHaveBeenNthCalledWith(2, '/auth/restablecer-password', { token: 'tok', password: 'Segura#2026' })
  })
})
