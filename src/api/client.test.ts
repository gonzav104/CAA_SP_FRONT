import { AxiosError } from 'axios'
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function rejectWith401(): AxiosAdapter {
  return (config: InternalAxiosRequestConfig) =>
    Promise.reject(
      new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, {
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config,
        data: {},
      }),
    )
}

async function loadClient() {
  vi.resetModules()
  return import('./client')
}

describe('api client', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8080')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('uses the env base URL and sends credentials', async () => {
    const { api } = await loadClient()
    expect(api.defaults.baseURL).toBe('http://localhost:8080')
    expect(api.defaults.withCredentials).toBe(true)
  })

  it('throws a clear error when VITE_API_URL is missing', async () => {
    vi.stubEnv('VITE_API_URL', '')
    await expect(loadClient()).rejects.toThrow('VITE_API_URL is not set')
  })

  it('calls the unauthorized handler on a 401 from a regular endpoint and still rejects', async () => {
    const { api, setUnauthorizedHandler } = await loadClient()
    const handler = vi.fn()
    setUnauthorizedHandler(handler)

    await expect(api.get('/api/pacientes', { adapter: rejectWith401() })).rejects.toMatchObject({
      response: { status: 401 },
    })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it.each(['/auth/login', '/api/usuarios/me'])('does not call the handler for a 401 on %s', async (url) => {
    const { api, setUnauthorizedHandler } = await loadClient()
    const handler = vi.fn()
    setUnauthorizedHandler(handler)

    await expect(api.request({ url, adapter: rejectWith401() })).rejects.toMatchObject({
      response: { status: 401 },
    })
    expect(handler).not.toHaveBeenCalled()
  })

  it('does not call an unregistered handler', async () => {
    const { api, setUnauthorizedHandler } = await loadClient()
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    setUnauthorizedHandler(null)

    await expect(api.get('/api/pacientes', { adapter: rejectWith401() })).rejects.toBeInstanceOf(AxiosError)
    expect(handler).not.toHaveBeenCalled()
  })
})
