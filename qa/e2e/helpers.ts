import { expect } from '@playwright/test'
import type { APIRequestContext, Page } from '@playwright/test'

export const PASSWORD = 'Qa#Clave2026'
export const API = 'http://localhost:8081'

export const accounts = {
  owner: 'owner@qa.test',
  admin: 'admin@qa.test',
  terapeuta: 'terapeuta@qa.test',
  lectura: 'lectura@qa.test',
  edicion: 'edicion@qa.test',
  solo: 'solo@qa.test',
  otro: 'otro.owner@qa.test',
} as const

export async function login(page: Page, email: string, password = PASSWORD) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Contraseña').fill(password)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page).not.toHaveURL(/\/login/)
}

export async function logout(page: Page) {
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await expect(page).toHaveURL(/\/login/)
}

/** The patient id behind a card of the directory, read from its link. */
export async function patientIdByName(page: Page, name: string) {
  await page.goto('/pacientes')
  const href = await page.getByRole('link', { name: new RegExp(name) }).first().getAttribute('href')
  const id = /\/pacientes\/([^/?]+)/.exec(href ?? '')?.[1]
  if (!id) throw new Error(`patient ${name} not found`)
  return id
}

/** Logs in through the API only, to read data of another tenant for isolation checks. */
export async function apiLogin(request: APIRequestContext, email: string) {
  const response = await request.post(`${API}/auth/login`, { data: { email, password: PASSWORD } })
  expect(response.ok()).toBeTruthy()
}
