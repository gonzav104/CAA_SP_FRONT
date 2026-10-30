import { expect, test } from '@playwright/test'
import type { Browser, Page } from '@playwright/test'
import { accounts, login } from './helpers'

// Real membership changes against the backend. Runs after qa.spec.ts (files run alphabetically): it
// removes people from Centro Sol, and relies on invitado.org@qa.test having accepted there.
test.describe.configure({ mode: 'serial' })

const INVITED = 'invitado.org@qa.test'

async function openMembers(page: Page) {
  await page.goto('/')
  await page.getByRole('link', { name: 'Miembros de Centro Sol' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Centro Sol' })).toBeVisible()
  return page.getByRole('list', { name: 'Miembros del espacio' })
}

async function asUser(browser: Browser, email: string) {
  const context = await browser.newContext()
  const page = await context.newPage()
  await login(page, email)
  return { context, page }
}

test.describe('membership changes', () => {
  test('OWNER changes the role of another member, and it holds after a reload', async ({ page }) => {
    await login(page, accounts.owner)
    const list = await openMembers(page)
    const teresa = list.locator('li', { hasText: 'Teresa Terapeuta' })
    await teresa.getByLabel(/Rol de gestión de/).selectOption('ADMIN')
    await expect(teresa).toContainText('Administrador')
    await page.reload()
    await expect(list.locator('li', { hasText: 'Teresa Terapeuta' })).toContainText('Administrador')

    await list.locator('li', { hasText: 'Teresa Terapeuta' }).getByLabel(/Rol de gestión de/).selectOption('MIEMBRO')
    await expect(list.locator('li', { hasText: 'Teresa Terapeuta' })).not.toContainText('Administrador')
  })

  test('ADMIN changes the clinical capacity, asking confirmation to take it away', async ({ page }) => {
    await login(page, accounts.admin)
    const list = await openMembers(page)
    const adrian = list.locator('li', { hasText: 'Adrián Admin' })
    await adrian.getByRole('button', { name: 'Habilitar como terapeuta' }).click()
    await expect(adrian).toContainText('Administrador · Terapeuta')

    await adrian.getByRole('button', { name: 'Quitar rol de terapeuta' }).click()
    await adrian.getByRole('button', { name: 'Confirmar' }).click()
    await expect(adrian).not.toContainText('Terapeuta')
  })

  test('OWNER cannot leave the space, and is told so', async ({ page }) => {
    await login(page, accounts.owner)
    const list = await openMembers(page)
    const olivia = list.locator('li', { hasText: 'Olivia Owner' })
    await expect(olivia).toContainText('Como propietario, no podés salir del espacio.')
    await expect(olivia.getByRole('button', { name: /Salir del espacio|Quitar del espacio/ })).toHaveCount(0)
  })

  test('a pending invitation can be resent and revoked, and is never a member', async ({ page }) => {
    const email = 'reenvio@qa.test'
    await login(page, accounts.owner)
    const list = await openMembers(page)
    await page.getByRole('button', { name: 'Invitar', exact: true }).click()
    await page.getByLabel('Email').fill(email)
    await page.getByRole('button', { name: 'Enviar invitación', exact: true }).click()
    await expect(page.getByRole('status')).toContainText(`Invitación enviada a ${email}`)

    await page.getByRole('button', { name: `Reenviar invitación a ${email}` }).click()
    await expect(page.getByRole('status')).toContainText(`Invitación reenviada a ${email}`)
    await expect(list).not.toContainText(email)

    await page.getByRole('button', { name: `Revocar invitación a ${email}` }).click()
    await expect(page.getByRole('list', { name: 'Invitaciones pendientes' })).not.toContainText(email)
  })

  test('OWNER removes a member, who loses the space even with an old link', async ({ page, browser }) => {
    const removed = await asUser(browser, INVITED)
    await openMembers(removed.page)
    const staleUrl = removed.page.url()

    await login(page, accounts.owner)
    const list = await openMembers(page)
    const row = list.locator('li', { hasText: INVITED })
    await row.getByRole('button', { name: 'Quitar del espacio' }).click()
    await row.getByRole('button', { name: 'Confirmar' }).click()
    await expect(list).not.toContainText(INVITED)

    await removed.page.goto(staleUrl)
    await expect(removed.page.getByText('No tenés acceso a este espacio.')).toBeVisible()
    await removed.context.close()
  })

  test('a MIEMBRO leaves the space and loses its patients', async ({ page }) => {
    await login(page, accounts.terapeuta)
    await page.goto('/pacientes')
    const patient = await page.getByRole('link', { name: /Paciente Uno/ }).getAttribute('href')
    const list = await openMembers(page)
    const self = list.locator('li', { hasText: 'Teresa Terapeuta' })
    await self.getByRole('button', { name: 'Salir del espacio' }).click()
    await expect(self).toContainText('Vas a perder el acceso')
    await self.getByRole('button', { name: 'Confirmar' }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('link', { name: 'Miembros de Centro Sol' })).toHaveCount(0)

    await page.goto(patient ?? '/')
    await expect(page.getByRole('heading', { level: 1, name: 'Paciente Uno' })).toHaveCount(0)
    await expect(page.getByText('No encontramos al paciente o no tenés acceso.')).toBeVisible()
  })
})

test.describe('patient journey', () => {
  test('registers a patient and a cartilla, and walks every section', async ({ page }) => {
    await login(page, accounts.owner)
    await page.getByRole('link', { name: 'Nuevo paciente' }).click()
    await page.getByLabel('Nombre', { exact: true }).fill('Recorrido')
    await page.getByLabel('Apellido', { exact: true }).fill('Final')
    await page.getByLabel('Fecha de nacimiento').fill('2019-05-05')
    await page.getByRole('button', { name: 'Crear paciente' }).click()
    await expect(page.getByRole('heading', { name: 'Recorrido Final ya está en tu espacio' })).toBeFocused()

    await page.getByRole('link', { name: 'Crear cartilla' }).click()
    await page.getByRole('textbox', { name: 'Nombre de la nueva cartilla' }).fill('Primera')
    await page.getByRole('button', { name: 'Crear cartilla', exact: true }).click()
    await expect(page.getByText('Cartilla creada.')).toBeVisible()

    const nav = page.getByRole('navigation', { name: 'Secciones del paciente' })
    for (const [section, heading] of [
      ['Sesiones', 'Sesiones'],
      ['Familia', 'Familia'],
      ['Equipo', 'Equipo'],
      ['Pictogramas', 'Pictogramas'],
      ['Cartillas', 'Cartillas'],
    ]) {
      await nav.getByRole('link', { name: section }).click()
      await expect(page.getByRole('heading', { level: 2, name: heading })).toBeVisible()
    }

    await page.getByRole('link', { name: 'Editar', exact: true }).click()
    await expect(page).toHaveURL(/\/editor$/)
  })
})
