import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import { fetchBoardDetail, fetchBoards } from './boardsApi'
import { boardDetailResponse, boardsListResponse } from './testing/fixtures'

function spyMutations() {
  return [
    vi.spyOn(api, 'post'),
    vi.spyOn(api, 'put'),
    vi.spyOn(api, 'patch'),
    vi.spyOn(api, 'delete'),
  ]
}

describe('boardsApi', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetchBoards issues GET on the patient cartillas', async () => {
    const mutations = spyMutations()
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: boardsListResponse })
    await expect(fetchBoards('p 1')).resolves.toBe(boardsListResponse)
    expect(get).toHaveBeenCalledExactlyOnceWith('/api/pacientes/p%201/cartillas')
    mutations.forEach((spy) => expect(spy).not.toHaveBeenCalled())
  })

  it('fetchBoardDetail issues a single GET on the aggregated detail', async () => {
    const mutations = spyMutations()
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: boardDetailResponse })
    await expect(fetchBoardDetail('p/1', 'c/1')).resolves.toBe(boardDetailResponse)
    expect(get).toHaveBeenCalledExactlyOnceWith('/api/pacientes/p%2F1/cartillas/c%2F1')
    mutations.forEach((spy) => expect(spy).not.toHaveBeenCalled())
  })
})
