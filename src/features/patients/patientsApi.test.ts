import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import { createPatient, fetchPatient, fetchPatients } from './patientsApi'
import { therapistPatientsResponse } from './testing/fixtures'

function spyMutations() {
  return [
    vi.spyOn(api, 'post'),
    vi.spyOn(api, 'put'),
    vi.spyOn(api, 'patch'),
    vi.spyOn(api, 'delete'),
  ]
}

describe('patientsApi', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetchPatients issues GET /api/pacientes and returns the raw data', async () => {
    const mutations = spyMutations()
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: therapistPatientsResponse })
    await expect(fetchPatients()).resolves.toBe(therapistPatientsResponse)
    expect(get).toHaveBeenCalledExactlyOnceWith('/api/pacientes')
    mutations.forEach((spy) => expect(spy).not.toHaveBeenCalled())
  })

  it('fetchPatient issues GET with an encoded id', async () => {
    const mutations = spyMutations()
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: therapistPatientsResponse[0] })
    await fetchPatient('a/b')
    expect(get).toHaveBeenCalledExactlyOnceWith('/api/pacientes/a%2Fb')
    mutations.forEach((spy) => expect(spy).not.toHaveBeenCalled())
  })

  it('createPatient issues POST under the encoded organization, never POST /api/pacientes', async () => {
    const request = { nombre: 'Noa', apellido: 'Díaz', fechaNacimiento: '2019-01-01' }
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: therapistPatientsResponse[0] })
    await expect(createPatient('org 1', request)).resolves.toBe(therapistPatientsResponse[0])
    expect(post).toHaveBeenCalledExactlyOnceWith('/api/organizaciones/org%201/pacientes', request)
  })
})
