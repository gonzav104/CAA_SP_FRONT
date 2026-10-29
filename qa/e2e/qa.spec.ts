import { expect, test } from '@playwright/test'
import { accounts, API, apiLogin, login, logout, PASSWORD, patientIdByName } from './helpers'

// REAL integration: Chromium → Vite (5174) → Spring Boot (8081) → PostgreSQL 15 (5455). No mocks.
// Not covered here (needs external services): Google sign-in and real e-mail delivery.

const nav = (page: import('@playwright/test').Page) => page.getByRole('navigation', { name: 'Secciones del paciente' })

test.describe('session', () => {
  test('protected routes redirect to login and keep the destination; login/logout work', async ({ page }) => {
    await page.goto('/pacientes')
    await expect(page).toHaveURL(/\/login/)
    await login(page, accounts.owner)
    await expect(page).toHaveURL(/\/pacientes$/)
    await expect(page.getByRole('heading', { name: 'Pacientes', exact: true })).toBeVisible()
    await logout(page)
    await page.goto('/pacientes')
    await expect(page).toHaveURL(/\/login/)
  })

  test('the session survives a reload (httpOnly cookie) and wrong credentials are refused', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(accounts.owner)
    await page.getByLabel('Contraseña').fill('Incorrecta#1')
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page.getByRole('alert')).toContainText('Email o contraseña incorrectos.')
    await login(page, accounts.owner)
    await page.reload()
    await expect(page).not.toHaveURL(/\/login/)
    expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toMatch(/jwt|token/i)
  })
})

test.describe('OWNER (therapist)', () => {
  test('sees her space and both patients, with every section', async ({ page }) => {
    await login(page, accounts.owner)
    const spaces = page.getByRole('region', { name: 'Tus espacios' })
    await expect(spaces.getByRole('link', { name: /^Centro Sol/ })).toContainText('Propietario · Terapeuta')
    await page.goto('/pacientes?espacio=' + (await spaces.getByRole('link', { name: /^Centro Sol/ }).getAttribute('href'))?.split('=')[1])
    await expect(page.getByRole('link', { name: /Paciente Uno/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Paciente Dos/ })).toBeVisible()
    await expect(page.getByText('Paciente Ajeno')).toHaveCount(0)

    await page.getByRole('link', { name: /Paciente Uno/ }).click()
    for (const section of ['Cartillas', 'Sesiones', 'Familia', 'Equipo', 'Pictogramas']) {
      await expect(nav(page).getByRole('link', { name: section })).toBeVisible()
    }
  })

  test('registers a patient inside the organization and lands on it', async ({ page }) => {
    await login(page, accounts.owner)
    await page.goto('/pacientes')
    await page.getByRole('button', { name: 'Nuevo paciente' }).click()
    await page.getByLabel('Nombre', { exact: true }).fill('Paciente')
    await page.getByLabel('Apellido', { exact: true }).fill('Tres')
    await page.getByLabel('Fecha de nacimiento').fill('2020-02-02')
    await page.getByRole('button', { name: 'Crear paciente' }).click()
    await expect(page).toHaveURL(/\/pacientes\/[^/]+\/cartillas$/)
    await expect(page.getByRole('heading', { name: 'Paciente Tres' })).toBeVisible()
    // Capabilities returned by the POST drive the sections right away.
    await expect(nav(page).getByRole('link', { name: 'Equipo' })).toBeVisible()
  })

  test('Modo Uso and Editor open the seeded principal cartilla', async ({ page }) => {
    await login(page, accounts.owner)
    const id = await patientIdByName(page, 'Paciente Uno')
    await page.goto(`/pacientes/${id}/cartillas`)
    await expect(page.getByText('Cartilla principal').first()).toBeVisible()
    await page.getByRole('link', { name: 'Editar' }).first().click()
    await expect(page).toHaveURL(/\/editor$/)
    await expect(page.getByText('Agua').first()).toBeVisible()
    await page.goBack()
    await page.getByRole('link', { name: 'Modo Uso' }).first().click()
    await expect(page).toHaveURL(/\/uso$/)
    await expect(page.getByText('Agua').first()).toBeVisible()
  })

  test('members page: everyone with roles, OWNER cannot be removed, therapist assignment works', async ({ page }) => {
    await login(page, accounts.owner)
    await page.getByRole('link', { name: 'Miembros de Centro Sol' }).click()
    const list = page.getByRole('list', { name: 'Miembros del espacio' })
    await expect(list.locator('li')).toHaveCount(3)
    const olivia = list.locator('li', { hasText: 'Olivia Owner' })
    await expect(olivia).toContainText('Propietario · Terapeuta')
    // The OWNER can neither leave nor change her own management role (she may toggle her therapist role).
    await expect(olivia.getByRole('button', { name: /Salir del espacio|Quitar del espacio/ })).toHaveCount(0)
    await expect(olivia.getByLabel(/Rol de gestión de/)).toHaveCount(0)
    await expect(list.locator('li', { hasText: 'Adrián Admin' }).getByLabel(/Rol de gestión de/)).toBeVisible()

    // Pending invitations are listed apart from the active members.
    const pending = page.getByRole('list', { name: 'Invitaciones pendientes' })
    await expect(pending).toContainText('invitado.org@qa.test')
    await expect(list).not.toContainText('invitado.org@qa.test')

    // Therapist assignment on Paciente Dos (Teresa is a therapist member not yet assigned there).
    const id = await patientIdByName(page, 'Paciente Dos')
    await page.goto(`/pacientes/${id}/equipo`)
    await page.getByLabel('Asignar terapeuta').selectOption({ label: 'Teresa Terapeuta (terapeuta@qa.test)' })
    await page.getByRole('button', { name: 'Asignar' }).click()
    await expect(page.getByRole('list', { name: 'Terapeutas asignados' })).toContainText('Teresa Terapeuta')
    await page.getByRole('list', { name: 'Terapeutas asignados' }).locator('li', { hasText: 'Teresa' }).getByRole('button', { name: 'Quitar asignación' }).click()
    await page.getByRole('button', { name: 'Sí, quitar asignación' }).click()
    await expect(page.getByRole('list', { name: 'Terapeutas asignados' })).not.toContainText('Teresa Terapeuta')
  })

  test('invites to the organization and the invitee shows as pending, never as a member', async ({ page }) => {
    await login(page, accounts.owner)
    await page.getByRole('link', { name: 'Miembros de Centro Sol' }).click()
    await page.getByRole('button', { name: 'Invitar', exact: true }).click()
    await page.getByLabel('Email').fill('otro.invitado@qa.test')
    await page.getByRole('button', { name: 'Enviar invitación', exact: true }).click()
    await expect(page.getByRole('status')).toContainText('Invitación enviada a otro.invitado@qa.test')
    await expect(page.getByRole('list', { name: 'Invitaciones pendientes' })).toContainText('otro.invitado@qa.test')
    await expect(page.getByRole('list', { name: 'Miembros del espacio' })).not.toContainText('otro.invitado@qa.test')
    await page.getByRole('button', { name: 'Revocar invitación a otro.invitado@qa.test' }).click()
    await expect(page.getByRole('list', { name: 'Invitaciones pendientes' })).not.toContainText('otro.invitado@qa.test')
  })

  test('family: invites, lists the pending one apart, and revokes it', async ({ page }) => {
    await login(page, accounts.owner)
    const id = await patientIdByName(page, 'Paciente Uno')
    await page.goto(`/pacientes/${id}/familia`)
    const linked = page.getByRole('list', { name: 'Familiares vinculados' })
    await expect(linked).toContainText('Lía Lectura')
    await expect(linked).toContainText('Eduardo Edición')
    await page.getByRole('button', { name: 'Invitar familiar' }).click()
    await page.getByLabel('Email del familiar').fill('tio@qa.test')
    await page.getByRole('button', { name: 'Enviar invitación', exact: true }).click()
    await expect(page.getByRole('status')).toContainText('Invitación enviada a tio@qa.test')
    await expect(linked).not.toContainText('tio@qa.test')
    await expect(page.getByRole('list', { name: 'Invitaciones pendientes' })).toContainText('tio@qa.test')
    await page.getByRole('button', { name: 'Revocar invitación a tio@qa.test' }).click()
    // The last pending invitation is gone, so the whole section disappears.
    await expect(page.getByRole('list', { name: 'Invitaciones pendientes' })).toHaveCount(0)
  })

  test('sessions: the seeded one is listed', async ({ page }) => {
    await login(page, accounts.owner)
    const id = await patientIdByName(page, 'Paciente Uno')
    await page.goto(`/pacientes/${id}/sesiones`)
    await expect(page.getByText('Pedir agua con la cartilla.').first()).toBeVisible()
  })
})

test.describe('ADMIN', () => {
  test('sees both patients, cannot change roles nor touch the OWNER, invites only MIEMBRO', async ({ page }) => {
    await login(page, accounts.admin)
    await page.goto('/pacientes')
    await expect(page.getByRole('link', { name: /Paciente Uno/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Paciente Dos/ })).toBeVisible()

    await page.goto('/')
    await page.getByRole('link', { name: 'Miembros de Centro Sol' }).click()
    await expect(page.getByLabel(/Rol de gestión de/)).toHaveCount(0)
    const list = page.getByRole('list', { name: 'Miembros del espacio' })
    await expect(list.locator('li', { hasText: 'Olivia Owner' }).getByRole('button')).toHaveCount(0)
    await page.getByRole('button', { name: 'Invitar', exact: true }).click()
    await expect(page.getByLabel('Rol de gestión').locator('option')).toHaveText(['Miembro'])
  })
})

test.describe('therapist member (assigned only to Paciente Uno)', () => {
  test('sees only her patient, with clinical sections but no administration', async ({ page }) => {
    await login(page, accounts.terapeuta)
    await page.goto('/pacientes')
    await expect(page.getByRole('link', { name: /Paciente Uno/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Paciente Dos/ })).toHaveCount(0)

    await page.getByRole('link', { name: /Paciente Uno/ }).click()
    for (const section of ['Cartillas', 'Sesiones', 'Familia', 'Equipo']) {
      await expect(nav(page).getByRole('link', { name: section })).toBeVisible()
    }
    await expect(page.getByRole('button', { name: 'Eliminar paciente' })).toHaveCount(0)
    await nav(page).getByRole('link', { name: 'Equipo' }).click()
    await expect(page.getByLabel('Asignar terapeuta')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Quitar asignación' })).toHaveCount(0)
  })

  test('direct access to a patient of the organization she is not assigned to is refused', async ({ page, request }) => {
    await login(page, accounts.owner)
    const dosId = await patientIdByName(page, 'Paciente Dos')
    await logout(page)
    await login(page, accounts.terapeuta)
    await page.goto(`/pacientes/${dosId}/cartillas`)
    await expect(page.getByRole('alert')).toBeVisible()
    void request
  })
})

test.describe('family LECTURA', () => {
  test('sees the shared patient read-only: no clinical sections, no edit controls', async ({ page }) => {
    await login(page, accounts.lectura)
    await page.goto('/pacientes')
    await expect(page.getByRole('link', { name: /Paciente Uno/ })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Nuevo paciente' })).toHaveCount(0)
    await page.getByRole('link', { name: /Paciente Uno/ }).click()
    for (const hidden of ['Sesiones', 'Familia', 'Equipo']) {
      await expect(nav(page).getByRole('link', { name: hidden })).toHaveCount(0)
    }
    await expect(page.getByRole('button', { name: 'Editar datos del paciente' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Nueva cartilla' })).toHaveCount(0)
    await expect(page.getByText('Solo lectura').first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Modo Uso' }).first()).toBeVisible()
  })

  test('typing the Editor URL directly shows the no-permission page', async ({ page }) => {
    await login(page, accounts.lectura)
    await page.goto('/pacientes')
    await page.getByRole('link', { name: /Paciente Uno/ }).click()
    const href = await page.getByRole('link', { name: 'Modo Uso' }).first().getAttribute('href')
    await page.goto(href!.replace(/\/uso$/, '/editor'))
    await expect(page.getByText('No tienes permiso para editar esta cartilla.')).toBeVisible()
  })
})

test.describe('family EDICION_LIMITADA', () => {
  test('can edit cartillas and the patient data, but neither delete nor see the clinical sections', async ({ page }) => {
    await login(page, accounts.edicion)
    await page.goto('/pacientes')
    await page.getByRole('link', { name: /Paciente Uno/ }).click()
    await expect(nav(page).getByRole('link', { name: 'Sesiones' })).toHaveCount(0)
    await expect(nav(page).getByRole('link', { name: 'Familia' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Editar datos del paciente' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Eliminar paciente' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Nueva cartilla' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Editar' }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /^Eliminar / })).toHaveCount(0)
  })
})

test.describe('cache isolation between users in the same browser', () => {
  test('after logout and a different login nothing of the previous account is shown', async ({ page }) => {
    await login(page, accounts.owner)
    await page.goto('/pacientes')
    await expect(page.getByRole('link', { name: /Paciente Dos/ })).toBeVisible()
    await logout(page)
    await login(page, accounts.lectura)
    await page.goto('/pacientes')
    await expect(page.getByRole('link', { name: /Paciente Uno/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Paciente Dos/ })).toHaveCount(0)
    await expect(page.getByRole('link', { name: /Paciente Tres/ })).toHaveCount(0)
  })

  test('another tenant is isolated: Otto sees only his own organization and patient', async ({ page }) => {
    await login(page, accounts.otro)
    await expect(page.getByRole('region', { name: 'Tus espacios' })).toContainText('Consultorio Ajeno')
    await expect(page.getByRole('region', { name: 'Tus espacios' })).not.toContainText('Centro Sol')
    await page.goto('/pacientes')
    await expect(page.getByRole('link', { name: /Paciente Ajeno/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Paciente Uno/ })).toHaveCount(0)
  })
})

test.describe('onboarding without organization', () => {
  test('a user with nothing is offered to create a space (never created for her) and enters it', async ({ page }) => {
    await login(page, accounts.solo)
    await expect(page.getByRole('heading', { name: 'Creá tu espacio de trabajo' })).toBeVisible()
    await page.getByLabel('Nombre del espacio').fill('Espacio de Sol')
    await page.getByRole('button', { name: 'Crear espacio' }).click()
    await expect(page).toHaveURL(/\/pacientes\?espacio=/)
    await page.goto('/')
    const spaces = page.getByRole('region', { name: 'Tus espacios' })
    await expect(spaces.getByRole('link', { name: /^Espacio de Sol/ })).toContainText('Propietario · Terapeuta')
  })
})

test.describe('invitation acceptance (planted known tokens: no real mail in QA)', () => {
  test('organization invitation: token leaves the URL, nothing is accepted automatically, then membership appears', async ({ page }) => {
    await page.goto('/invitaciones/aceptar?token=qa-token-invitacion-organizacion')
    // Not signed in → login, then back to the invitation.
    await expect(page).toHaveURL(/\/login/)
    expect(page.url()).not.toContain('qa-token')
    await login(page, 'invitado.org@qa.test')
    await expect(page).toHaveURL(/\/invitaciones\/aceptar$/)
    expect(page.url()).not.toContain('qa-token')
    await expect(page.getByText(/con la cuenta invitado.org@qa.test/)).toBeVisible()
    await page.getByRole('button', { name: 'Aceptar invitación' }).click()
    await expect(page.getByText('Ya formas parte de la organización.')).toBeVisible()
    await page.getByRole('link', { name: 'Ir al inicio' }).click()
    await expect(page.getByRole('region', { name: 'Tus espacios' })).toContainText('Centro Sol')
    await expect(page.getByRole('region', { name: 'Tus espacios' })).toContainText('Miembro')
  })

  test('a spent link is refused with the generic message', async ({ page }) => {
    await login(page, 'invitado.org@qa.test')
    await page.goto('/invitaciones/aceptar?token=qa-token-invitacion-organizacion')
    await page.getByRole('button', { name: 'Aceptar invitación' }).click()
    await expect(page.getByRole('alert')).toContainText('El enlace no es válido o ha expirado.')
  })

  test('the invitation of another account is refused with the same generic message', async ({ page }) => {
    await login(page, accounts.solo)
    await page.goto('/invitaciones/aceptar?token=qa-token-invitacion-familiar')
    await page.getByRole('button', { name: 'Aceptar invitación' }).click()
    await expect(page.getByRole('alert')).toContainText('El enlace no es válido o ha expirado.')
  })

  test('family invitation: accept, then the patient is reachable with EDICION_LIMITADA', async ({ page }) => {
    await login(page, 'invitada.familia@qa.test')
    await page.goto('/invitaciones/aceptar?token=qa-token-invitacion-familiar')
    await page.getByRole('button', { name: 'Aceptar invitación' }).click()
    await expect(page.getByText('Ya tienes acceso al paciente.')).toBeVisible()
    await page.getByRole('link', { name: 'Ir al paciente' }).click()
    await expect(page).toHaveURL(/\/pacientes\/[^/]+\/cartillas$/)
    await expect(page.getByRole('heading', { name: 'Paciente Dos' })).toBeVisible()
    await expect(nav(page).getByRole('link', { name: 'Sesiones' })).toHaveCount(0)
  })

  test('no account yet: invitation → register → login → accept', async ({ page }) => {
    await page.goto('/invitaciones/aceptar?token=qa-token-invitado-sin-cuenta')
    await expect(page).toHaveURL(/\/login/)
    await page.getByRole('link', { name: 'Crear cuenta' }).click()
    await expect(page).toHaveURL(/\/registro/)
    await page.getByLabel('Nombre').fill('Nuevo Invitado')
    await page.getByLabel('Email').fill('nuevo@qa.test')
    await page.getByLabel('Contraseña').fill(PASSWORD)
    await page.getByRole('button', { name: 'Crear cuenta' }).click()
    await expect(page.getByText('Tu cuenta fue creada. Ya puedes iniciar sesión.')).toBeVisible()
    await page.getByLabel('Email').fill('nuevo@qa.test')
    await page.getByLabel('Contraseña').fill(PASSWORD)
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page).toHaveURL(/\/invitaciones\/aceptar$/)
    await page.getByRole('button', { name: 'Aceptar invitación' }).click()
    await expect(page.getByText('Ya formas parte de la organización.')).toBeVisible()
    await page.getByRole('link', { name: 'Ir al inicio' }).click()
    await expect(page.getByRole('region', { name: 'Tus espacios' })).toContainText('Centro Sol')
  })

  test('a reload that loses the token explains how to reopen the link', async ({ page }) => {
    await login(page, accounts.solo)
    await page.goto('/invitaciones/aceptar')
    await expect(page.getByRole('alert')).toContainText('Vuelve a abrir el enlace que recibiste por correo.')
  })
})

test.describe('registration and password recovery', () => {
  test('duplicate e-mail and weak password are reported', async ({ page }) => {
    await page.goto('/registro')
    await page.getByLabel('Nombre').fill('Repetida')
    await page.getByLabel('Email').fill(accounts.owner)
    await page.getByLabel('Contraseña').fill(PASSWORD)
    await page.getByRole('button', { name: 'Crear cuenta' }).click()
    await expect(page.getByRole('alert')).toContainText('Ya existe una cuenta con ese email.')
    await page.getByLabel('Contraseña').fill('debil')
    await page.getByRole('button', { name: 'Crear cuenta' }).click()
    await expect(page.getByText(/al menos 8 caracteres/).first()).toBeVisible()
  })

  test('forgot password answers generically for any e-mail', async ({ page }) => {
    await page.goto('/olvide-password')
    await page.getByLabel('Email').fill('no-existe@qa.test')
    await page.getByRole('button', { name: 'Enviar enlace' }).click()
    await expect(page.getByRole('status')).toContainText('Si el email está registrado')
  })

  test('reset link (planted token): token leaves the URL, password changes, old one stops working', async ({ page }) => {
    const NEW_PASSWORD = 'Nueva#Clave2026'
    await page.goto('/restablecer-password?token=qa-token-restablecer-password')
    await expect(page.getByLabel('Nueva contraseña', { exact: true })).toBeVisible()
    expect(page.url()).not.toContain('qa-token')
    await page.getByLabel('Nueva contraseña', { exact: true }).fill(NEW_PASSWORD)
    await page.getByLabel('Repite la nueva contraseña').fill(NEW_PASSWORD)
    await page.getByRole('button', { name: 'Guardar contraseña' }).click()
    await expect(page.getByRole('status')).toContainText('Tu contraseña fue restablecida correctamente.')
    await page.getByRole('link', { name: 'Ir a iniciar sesión' }).click()
    await page.getByLabel('Email').fill(accounts.solo)
    await page.getByLabel('Contraseña').fill(PASSWORD)
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page.getByRole('alert')).toContainText('Email o contraseña incorrectos.')
    await login(page, accounts.solo, NEW_PASSWORD)
    // A used link is refused.
    await page.goto('/restablecer-password?token=qa-token-restablecer-password')
    await page.getByLabel('Nueva contraseña', { exact: true }).fill(NEW_PASSWORD)
    await page.getByLabel('Repite la nueva contraseña').fill(NEW_PASSWORD)
    await page.getByRole('button', { name: 'Guardar contraseña' }).click()
    await expect(page.getByRole('alert')).toContainText('El enlace no es válido o ha expirado.')
  })
})

test.describe('backend contract sanity (API, no UI)', () => {
  test('capabilities are decided by the backend per patient', async ({ request }) => {
    await apiLogin(request, accounts.lectura)
    const patients = (await (await request.get(`${API}/api/pacientes`)).json()) as Array<{ capacidades: string[]; miPermiso: string | null }>
    expect(patients).toHaveLength(1)
    expect(patients[0]).toMatchObject({ miPermiso: 'LECTURA', capacidades: [] })
  })

  test('another tenant\'s patient is a 404 for a user without access', async ({ request, page }) => {
    await login(page, accounts.otro)
    const ajenoId = await patientIdByName(page, 'Paciente Ajeno')
    await apiLogin(request, accounts.owner)
    const response = await request.get(`${API}/api/pacientes/${ajenoId}`)
    expect(response.status()).toBe(404)
  })
})

test.afterAll(() => {
  // Leave a hint for whoever runs this twice: the data is one-way, reset before the next run.
  console.log('Re-run needs a clean database: qa/qa.sh reset && qa/qa.sh up && qa/qa.sh seed')
})
