// Fictional, reproducible data for the isolated QA environment. Everything goes through the real backend
// API (so hashing, tenancy and capabilities are the real ones); only the single-use e-mail tokens are
// planted with SQL, because the QA backend has no real mail provider and the raw tokens would be lost.
// Run through `qa/qa.sh seed`. It refuses to run against anything but the QA API on localhost.
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'

const API = process.env.QA_API
const DB_CONTAINER = process.env.QA_DB_CONTAINER
const DB_USER = process.env.QA_DB_USER
const DB_NAME = process.env.QA_DB_NAME
const FRONT = process.env.QA_FRONT ?? 'http://localhost:5174'

if (!API || !/^http:\/\/localhost:8081$/.test(API) || DB_NAME !== 'caa_qa' || DB_CONTAINER !== 'caa_qa_postgres') {
  console.error('REFUSED: this seed only runs against the QA environment (use qa/qa.sh seed).')
  process.exit(2)
}

export const PASSWORD = 'Qa#Clave2026'

const USERS = {
  owner: { nombre: 'Olivia Owner', email: 'owner@qa.test' },
  admin: { nombre: 'Adrián Admin', email: 'admin@qa.test' },
  terapeuta: { nombre: 'Teresa Terapeuta', email: 'terapeuta@qa.test' },
  lectura: { nombre: 'Lía Lectura', email: 'lectura@qa.test' },
  edicion: { nombre: 'Eduardo Edición', email: 'edicion@qa.test' },
  solo: { nombre: 'Sol Sola', email: 'solo@qa.test' },
  invitadoOrg: { nombre: 'Iván Invitado', email: 'invitado.org@qa.test' },
  invitadaFamilia: { nombre: 'Flor Familia', email: 'invitada.familia@qa.test' },
  otro: { nombre: 'Otto Otro', email: 'otro.owner@qa.test' },
}

// Known single-use tokens for the invitations / reset left pending for manual testing.
const TOKENS = {
  invitadoOrg: 'qa-token-invitacion-organizacion',
  invitadaFamilia: 'qa-token-invitacion-familiar',
  nuevo: 'qa-token-invitado-sin-cuenta',
  reset: 'qa-token-restablecer-password',
}

const sha256 = (value) => createHash('sha256').update(value, 'utf8').digest('hex')

class Client {
  cookie = ''
  async request(method, path, body) {
    const response = await fetch(`${API}${path}`, {
      method,
      headers: { 'content-type': 'application/json', ...(this.cookie ? { cookie: this.cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const setCookie = response.headers.getSetCookie?.() ?? []
    if (setCookie.length) this.cookie = setCookie.map((entry) => entry.split(';')[0]).join('; ')
    const text = await response.text()
    const data = text ? JSON.parse(text) : null
    if (!response.ok) throw new Error(`${method} ${path} -> ${response.status} ${text.slice(0, 200)}`)
    return data
  }
  get = (path) => this.request('GET', path)
  post = (path, body) => this.request('POST', path, body)
  put = (path, body) => this.request('PUT', path, body)
  async login(user) {
    this.cookie = ''
    await this.post('/auth/login', { email: user.email, password: PASSWORD })
    return this
  }
}

const sql = (statement) =>
  execFileSync('docker', ['exec', '-i', DB_CONTAINER, 'psql', '-U', DB_USER, '-d', DB_NAME, '-v', 'ON_ERROR_STOP=1', '-q', '-c', statement], {
    encoding: 'utf8',
  })

const plantInvitationToken = (email, token) =>
  sql(
    `UPDATE invitaciones SET token_hash='${sha256(token)}', expira_en=now() + interval '7 days' ` +
      `WHERE lower(email)='${email.toLowerCase()}' AND estado='PENDIENTE';`,
  )

const link = (path, token) => `${FRONT}${path}?token=${token}`

async function main() {
  // Idempotence guard: a second run would collide on the unique e-mails.
  const probe = new Client()
  try {
    await probe.login(USERS.owner)
    console.error('Already seeded. For a clean slate: qa/qa.sh reset && qa/qa.sh up && qa/qa.sh seed')
    process.exit(1)
  } catch {
    // Not seeded yet: continue.
  }

  for (const user of Object.values(USERS)) {
    await new Client().post('/api/usuarios/registro', { nombre: user.nombre, email: user.email, password: PASSWORD })
  }

  // --- Organization "Centro Sol": Olivia (OWNER, therapist) invites an ADMIN and a therapist member. ---
  const owner = await new Client().login(USERS.owner)
  const org = await owner.post('/api/organizaciones', { nombre: 'Centro Sol' })
  const acceptOrgInvitation = async (user, rolGestion, esTerapeuta, token) => {
    await owner.post(`/api/organizaciones/${org.id}/invitaciones`, { email: user.email, rolGestion, esTerapeuta })
    plantInvitationToken(user.email, token)
    const client = await new Client().login(user)
    await client.post('/api/invitaciones/aceptar', { token })
  }
  await acceptOrgInvitation(USERS.admin, 'ADMIN', false, 'qa-seed-admin')
  await acceptOrgInvitation(USERS.terapeuta, 'MIEMBRO', true, 'qa-seed-terapeuta')
  const members = await owner.get(`/api/organizaciones/${org.id}/miembros`)
  const terapeutaId = members.find((m) => m.email === USERS.terapeuta.email).usuarioId

  // --- Patients ---
  const uno = await owner.post(`/api/organizaciones/${org.id}/pacientes`, {
    nombre: 'Paciente', apellido: 'Uno', fechaNacimiento: '2018-04-12',
  })
  const dos = await owner.post(`/api/organizaciones/${org.id}/pacientes`, {
    nombre: 'Paciente', apellido: 'Dos', fechaNacimiento: '2019-09-30',
  })
  await owner.post(`/api/pacientes/${uno.id}/terapeutas`, { usuarioId: terapeutaId }) // Teresa sees only "Uno"

  // --- Family access to Paciente Uno (accepted) ---
  const acceptFamilyInvitation = async (user, permiso, token) => {
    await owner.post(`/api/pacientes/${uno.id}/colaboradores`, { email: user.email, permiso })
    plantInvitationToken(user.email, token)
    const client = await new Client().login(user)
    await client.post('/api/invitaciones/aceptar', { token })
  }
  await acceptFamilyInvitation(USERS.lectura, 'LECTURA', 'qa-seed-lectura')
  await acceptFamilyInvitation(USERS.edicion, 'EDICION_LIMITADA', 'qa-seed-edicion')

  // --- Content for Editor / Modo Uso / Sesiones (Paciente Uno) ---
  const pictograms = [
    [23392, 'Quiero'], [27559, 'Comer'], [32464, 'Agua'], [32648, 'Jugar'], [35539, 'Baño'],
  ]
  const materialized = []
  for (const [arasaacId, etiqueta] of pictograms) {
    materialized.push({ etiqueta, ...(await owner.post('/api/pictogramas-globales/materializar', { arasaacId, etiqueta })) })
  }
  const board = await owner.post(`/api/pacientes/${uno.id}/cartillas`, { nombre: 'Cartilla principal', esPrincipal: true })
  const category = await owner.post(`/api/pacientes/${uno.id}/cartillas/${board.id}/categorias`, {
    nombre: 'Necesidades', colorHex: '#4F9DDE', orden: 0,
  })
  let order = 0
  for (const item of materialized) {
    const resourceId = item.id ?? item.pictogramaId ?? item.pictograma?.id
    await owner.post(`/api/pacientes/${uno.id}/cartillas/${board.id}/categorias/${category.id}/items`, {
      textoHablado: item.etiqueta, ordenVisual: order++, recursoGlobalId: resourceId, esCore: order <= 2, visibleEnModoUso: true,
    })
  }
  await owner.post(`/api/pacientes/${uno.id}/sesiones`, {
    fechaHora: '2026-10-20T10:30:00', disposicion: 'Receptivo', objetivosTrabajados: 'Pedir agua con la cartilla.',
    observaciones: 'Sesión ficticia de QA.', estrategiasYProximosPasos: 'Sumar la categoría Jugar.',
  })

  // --- Another tenant, to prove isolation between organizations ---
  const otro = await new Client().login(USERS.otro)
  const otherOrg = await otro.post('/api/organizaciones', { nombre: 'Consultorio Ajeno' })
  await otro.post(`/api/organizaciones/${otherOrg.id}/pacientes`, { nombre: 'Paciente', apellido: 'Ajeno', fechaNacimiento: '2017-01-15' })

  // --- Pending items left for manual testing (known tokens) ---
  await owner.post(`/api/organizaciones/${org.id}/invitaciones`, { email: USERS.invitadoOrg.email, rolGestion: 'MIEMBRO', esTerapeuta: false })
  plantInvitationToken(USERS.invitadoOrg.email, TOKENS.invitadoOrg)
  await owner.post(`/api/pacientes/${dos.id}/colaboradores`, { email: USERS.invitadaFamilia.email, permiso: 'EDICION_LIMITADA' })
  plantInvitationToken(USERS.invitadaFamilia.email, TOKENS.invitadaFamilia)
  await owner.post(`/api/organizaciones/${org.id}/invitaciones`, { email: 'nuevo@qa.test', rolGestion: 'MIEMBRO', esTerapeuta: true })
  plantInvitationToken('nuevo@qa.test', TOKENS.nuevo)
  sql(`UPDATE usuarios SET reset_token='${sha256(TOKENS.reset)}', reset_token_expira=now() + interval '7 days' WHERE email='${USERS.solo.email}';`)

  console.log(`\nQA data ready. Password for every account: ${PASSWORD}\n`)
  console.log('Accounts:')
  for (const user of Object.values(USERS)) console.log(`  ${user.email.padEnd(30)} ${user.nombre}`)
  console.log('\nPending links (single use; re-seed after a reset to get them again):')
  console.log(`  Org invitation for ${USERS.invitadoOrg.email}:   ${link('/invitaciones/aceptar', TOKENS.invitadoOrg)}`)
  console.log(`  Family invitation for ${USERS.invitadaFamilia.email}: ${link('/invitaciones/aceptar', TOKENS.invitadaFamilia)}`)
  console.log(`  Invitation for nuevo@qa.test (no account yet): ${link('/invitaciones/aceptar', TOKENS.nuevo)}`)
  console.log(`  Password reset for ${USERS.solo.email}:        ${link('/restablecer-password', TOKENS.reset)}`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
