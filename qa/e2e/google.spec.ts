import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { API } from './helpers'

// Wiring of Google Sign-In in the QA stack. It does NOT log in with Google: that needs a human choosing a real
// Google account (and, for the recovery, the mailed link) — see "Google real" in qa/README.md.
// Whether Google is on is read from the QA state file written by `qa/qa.sh google-restart on|off`.
function googleIsOn() {
  try {
    return readFileSync(new URL('../.work/google.mode', import.meta.url), 'utf8').trim() === 'on'
  } catch {
    return false
  }
}

const GOOGLE_BUTTON = 'iframe[src*="accounts.google.com/gsi/button"], div[role="button"][aria-labelledby*="button-label"]'

test.describe('Google sign-in wiring', () => {
  test('is off by default: no Google button on login nor on the recovery page', async ({ page }) => {
    test.skip(googleIsOn(), 'Google is enabled in this QA run')
    await page.goto('/login')
    await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible()
    await expect(page.locator(GOOGLE_BUTTON)).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Recuperar el acceso con Google' })).toHaveCount(0)
    await page.goto('/recuperar-google')
    await expect(page.getByText('El acceso con Google no está disponible en este momento.')).toBeVisible()
  })

  test('is on: the official Google button renders on login and on the recovery page', async ({ page }) => {
    test.skip(!googleIsOn(), 'Google is not enabled (qa/qa.sh google-restart on)')
    await page.goto('/login')
    await expect(page.locator(GOOGLE_BUTTON).first()).toBeVisible({ timeout: 20_000 })
    await page.goto('/recuperar-google')
    await expect(page.locator(GOOGLE_BUTTON).first()).toBeVisible({ timeout: 20_000 })
  })

  test('the API refuses a forged ID token with the generic 401 and sets no cookie', async ({ request }) => {
    for (const path of ['/auth/google', '/auth/google/completar-registro', '/auth/google/recuperacion/solicitar']) {
      const response = await request.post(`${API}${path}`, { data: { idToken: 'not-a-real-google-id-token' } })
      expect(response.status(), path).toBe(401)
      expect(response.headers()['set-cookie'], path).toBeUndefined()
    }
    const recovery = await request.post(`${API}/auth/google/recuperacion/completar`, {
      data: { idToken: 'not-a-real-google-id-token', token: 'whatever', password: 'Qa#Clave2026' },
    })
    expect(recovery.status()).toBe(401)
    expect(recovery.headers()['set-cookie']).toBeUndefined()
  })
})
