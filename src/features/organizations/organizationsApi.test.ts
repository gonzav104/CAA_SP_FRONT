import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import { fetchOrganizations } from './organizationsApi'
import { ownerOrganization } from './testing/fixtures'

describe('fetchOrganizations', () => {
  afterEach(() => vi.restoreAllMocks())

  it('reads GET /api/organizaciones', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: [ownerOrganization] })
    await expect(fetchOrganizations()).resolves.toEqual([ownerOrganization])
    expect(api.get).toHaveBeenCalledWith('/api/organizaciones')
  })
})
