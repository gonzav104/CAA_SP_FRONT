# Entorno QA aislado (frontend + backend real)

Entorno para probar la aplicación completa contra el backend real y PostgreSQL 15, con **datos ficticios**.
Está aislado de cualquier base existente: usa su propio contenedor, volumen y puertos.

| Pieza | Valor |
|---|---|
| Aplicación (Vite) | http://localhost:5174 |
| API (Spring Boot) | http://localhost:8081 |
| Base de datos | `127.0.0.1:5455`, base `caa_qa`, contenedor `caa_qa_postgres` |
| Volumen | `caa_qa_pgdata` (nuevo; el único que `reset` puede borrar) |

> Nunca se usan `caa_postgres`, `caa_db`, `caa_sp_db_data_final`, los puertos
> 5444, 54322 ni 8080, ni el `.env` del backend. El script se niega a ejecutarse si un nombre o puerto
> coincide con esos recursos. No se usa `docker prune`.

## Comandos

```bash
qa/qa.sh up       # compila una COPIA del backend (rama BACKEND_REF, sin parches), levanta base, API y Vite
qa/qa.sh seed     # crea cuentas, organización, pacientes y contenido ficticios (usa la API real)
qa/qa.sh status   # estado de base, API y frontend
qa/qa.sh logs     # últimas líneas del log de la API
qa/qa.sh mail-config    # guarda tu clave de Resend (se escribe sin eco) en qa/.work/mail.env
qa/qa.sh api-restart    # reinicia SOLO la API de QA con correo real (api-restart inert vuelve al modo inerte)
qa/qa.sh mail-clear     # borra la clave guardada
qa/qa.sh google-config  # guarda el Client ID de Google (público) en qa/.work/google.env
qa/qa.sh google-restart # reinicia la API y Vite de QA CON Google (google-restart off lo apaga); conserva el modo de correo
qa/qa.sh google-clear   # borra el Client ID guardado
qa/qa.sh plant-invitation EMAIL TOKEN  # da a la invitación PENDIENTE de EMAIL un enlace conocido de un solo uso
qa/qa.sh down     # detiene todo (los datos quedan en el volumen)
qa/qa.sh reset    # borra SOLO el contenedor y el volumen de QA (hay que volver a hacer up + seed)
npm run qa:e2e    # suite Playwright contra este entorno (consume datos: reset + up + seed antes de repetirla)
```

El backend se exporta con `git archive` desde `../CAA_SP` (solo lectura) y se compila en `qa/.work/`
(ignorado por Git). La revisión se elige con `BACKEND_REF` (por defecto `main`, que ya incluye la corrección de las invitaciones).
No se aplica ningún parche: se prueba el backend tal como está comiteado.

## Cuentas (contraseña de todas: `Qa#Clave2026`)

| Email | Perfil | Qué debería ver |
|---|---|---|
| `owner@qa.test` | OWNER y terapeuta de **Centro Sol** | Todo: pacientes Uno y Dos, miembros, invitaciones, equipo, familia, sesiones |
| `admin@qa.test` | ADMIN (no terapeuta) | Ambos pacientes; no cambia roles; solo invita como Miembro; no toca al OWNER |
| `terapeuta@qa.test` | MIEMBRO terapeuta, asignada solo a **Paciente Uno** | Solo Paciente Uno; Sesiones, Familia y Equipo (solo lectura); no administra |
| `lectura@qa.test` | Familiar `LECTURA` de Paciente Uno | Paciente Uno en solo lectura; sin Sesiones/Familia/Equipo; Modo Uso sí |
| `edicion@qa.test` | Familiar `EDICION_LIMITADA` de Paciente Uno | Edita cartillas y datos del paciente; no elimina; sin secciones clínicas |
| `solo@qa.test` | Sin organización | Pantalla de bienvenida para crear su propio espacio |
| `invitado.org@qa.test` | Con cuenta, invitada a Centro Sol | Acepta la invitación con el enlace de abajo |
| `invitada.familia@qa.test` | Con cuenta, invitada como familiar de Paciente Dos | Acepta la invitación con el enlace de abajo |
| `otro.owner@qa.test` | OWNER de **Consultorio Ajeno** (otro inquilino) | Solo su organización y su paciente; nada de Centro Sol |

### Enlaces pendientes (de un solo uso)

El QA no envía correos reales, por eso `seed` deja enlaces con tokens conocidos:

- Invitación de organización (cuenta existente): `http://localhost:5174/invitaciones/aceptar?token=qa-token-invitacion-organizacion`
- Invitación familiar (cuenta existente): `http://localhost:5174/invitaciones/aceptar?token=qa-token-invitacion-familiar`
- Invitación para `nuevo@qa.test` (**sin cuenta**: registro → login → aceptar): `http://localhost:5174/invitaciones/aceptar?token=qa-token-invitado-sin-cuenta`
- Restablecer la contraseña de `solo@qa.test`: `http://localhost:5174/restablecer-password?token=qa-token-restablecer-password`

## Recorridos sugeridos para la prueba manual

1. **Sesión:** entrar y salir con cada cuenta; recargar la página (la sesión persiste); abrir `/pacientes` sin sesión
   (redirige a login y vuelve después de entrar).
2. **Organización y espacios (`owner`):** en Inicio, “Tus espacios”; “Miembros de Centro Sol”; invitar a alguien,
   ver que queda como *pendiente* (no como miembro), reenviar y revocar.
3. **Pacientes:** crear un paciente nuevo (queda en Centro Sol y se abre su espacio); abrir Editor y Modo Uso de
   la “Cartilla principal” de Paciente Uno.
4. **Equipo clínico:** en Paciente Dos → Equipo, asignar y quitar a Teresa; entrar como `terapeuta` y comprobar que
   solo ve a quien tiene asignado.
5. **Familia:** como `owner`, Paciente Uno → Familia: familiares vinculados vs. invitaciones pendientes.
6. **Permisos:** repetir los pasos 3–5 con `admin`, `terapeuta`, `lectura` y `edicion` y comparar con la tabla.
7. **Aislamiento entre usuarios:** iniciar sesión como `owner`, cerrar sesión, entrar como `lectura` en la misma
   pestaña y comprobar que no queda nada de la cuenta anterior; probar también con `otro.owner`.
8. **Invitaciones:** abrir cada enlace de arriba (sin sesión y con sesión). La invitación **nunca se acepta sola**;
   el token desaparece de la barra de direcciones; con otra cuenta el resultado es el mensaje genérico
   “El enlace no es válido o ha expirado.”.
9. **Registro y recuperación:** crear una cuenta, probar un email repetido y una contraseña débil; “Olvidé mi
   contraseña” responde igual exista o no el email.

## Correo real con el sandbox de Resend

Por defecto la API de QA corre **inerte**: clave de Resend de relleno, nada se entrega. `up` y `seed` **siempre**
arrancan así (el seed registra usuarios `@qa.test` y, con correo real, intentaría enviarles bienvenidas), y el
`seed` se niega a correr si la API está en modo real. El correo real es opt-in y solo afecta a la API de QA; no
toca la base, el frontend, el backend ni nada fuera de `qa/`.

**Limitación del sandbox:** el remitente `onboarding@resend.dev` solo entrega al **email de tu cuenta de Resend**.
Para las pruebas de abajo usás esa única dirección (`TU_EMAIL`) como destinatario. Con un dominio verificado en
Resend no habría límite (se configuraría `RESEND_FROM_EMAIL`/`QA_RESEND_FROM_EMAIL`).

### Cómo cargar tu clave de forma segura

La clave **nunca** se imprime, no va en ningún argumento de proceso (el arranque la pasa por un archivo temporal
`600` que se borra en cuanto la API arranca) y vive solo en `qa/.work/` (ignorado por Git) o en tu shell.
**No la pegues en el chat ni uses `!` dentro de Claude Code** (quedaría en la conversación): hacelo en tu terminal.

```bash
cd ~/proyectos/CAA_SP_FRONT
qa/qa.sh mail-config      # pide la clave sin mostrarla y el remitente (Enter = onboarding@resend.dev)
```

Alternativa sin archivo (solo en esa terminal): `read -rsp "Resend: " QA_RESEND_API_KEY; echo; export QA_RESEND_API_KEY`.
La variable de la shell tiene prioridad sobre el archivo. Para olvidar la clave: `qa/qa.sh mail-clear`.

### Orden

```bash
qa/qa.sh up && qa/qa.sh seed     # inerte: datos ficticios sin enviar nada
qa/qa.sh api-restart             # ahora sí, correo real (FRONTEND_URL = http://localhost:5174)
qa/qa.sh status                  # "mail en la API: real"
# ... pruebas ...
qa/qa.sh api-restart inert       # al terminar, vuelve a inerte
```

Si la clave es de tipo *Sending access*, el log de arranque puede mostrar un ERROR del chequeo de Resend
(`domains().list()` no está permitido para esa clave); no bloquea el envío. Con *Full access* debería avisar solo del
uso del dominio sandbox. Si un correo no llega, la UI igual dice “enviada” (el backend nunca falla por el correo):
mirá `qa/qa.sh logs 200` buscando `No se pudo enviar el email` y la pestaña *Emails* del panel de Resend.

### Las tres pruebas (con `TU_EMAIL` = el email de tu cuenta de Resend)

Contraseña de las cuentas `@qa.test`: `Qa#Clave2026`. Los enlaces de los correos apuntan a `http://localhost:5174`.

1. **Invitación familiar.**
   `owner@qa.test` → Pacientes → *Paciente Uno* → **Familia** → *Invitar familiar* → `TU_EMAIL`, permiso → *Enviar
   invitación*. Debe aparecer en “Invitaciones pendientes” (no como vinculado). Abrí el correo
   “Te invitaron a colaborar con un paciente” y su enlace: sin cuenta, *Crear cuenta* con `TU_EMAIL` (te llega
   además la bienvenida) → iniciar sesión → **Aceptar invitación**. Esperado: “Ya tienes acceso al paciente.”, y
   para `owner` la invitación pasa de pendiente a vinculada.
2. **Invitación a la organización.**
   Cerrá sesión; `owner@qa.test` → Inicio → *Centro Sol* → **Miembros** → *Invitar* → `TU_EMAIL`, rol *Miembro* →
   *Enviar invitación*. Abrí el correo “Te invitaron a unirte a Centro Sol” y su enlace; entrá con `TU_EMAIL` →
   **Aceptar invitación**. Esperado: “Ya formas parte de la organización.” y Centro Sol en “Tus espacios”.
3. **Recuperación de contraseña.**
   Cerrá sesión → *Olvidé mi contraseña* → `TU_EMAIL` (mensaje genérico). Abrí el correo de recuperación y su
   enlace (vale 1 hora) → nueva contraseña y confirmación → “Contraseña restablecida” → iniciá sesión con la nueva.
   Reabrir el mismo enlace debe dar “El enlace no es válido o ha expirado.” (es de un solo uso).

## Google real (inicio de sesión y recuperación de identidad)

Google está **apagado por defecto**: `up` y `seed` arrancan sin Client ID y el botón ni se dibuja. Se enciende con el
mismo Client ID en backend (`GOOGLE_CLIENT_ID`, la audiencia que valida el ID token) y frontend
(`VITE_GOOGLE_CLIENT_ID`). El Client ID es **público** (se ve en el código de la página) y **no se usa ningún Client
Secret**: solo el flujo de ID token. Los ID tokens y las cookies nunca se imprimen.

### Configuración

1. Google Cloud Console → tu cliente OAuth **Web**: orígenes JavaScript autorizados `http://localhost:5174` (QA) y
   `http://localhost:5173`. No hacen falta URIs de redirección.
2. Pantalla de consentimiento: si está en modo *Testing*, agregá como **usuarios de prueba** las cuentas de Google que
   vayas a usar (si no, Google bloquea el acceso). Los cambios de orígenes pueden tardar unos minutos en aplicar.
3. En tu terminal:

```bash
cd ~/proyectos/CAA_SP_FRONT
qa/qa.sh google-config     # pegá el Client ID (termina en .apps.googleusercontent.com)
qa/qa.sh google-restart    # reinicia SOLO la API y Vite de QA; la base no se toca y el modo de correo se conserva
qa/qa.sh status            # "google en QA: on"
```

Recargá el navegador. Variante sin archivo: `export QA_GOOGLE_CLIENT_ID=...` antes de `google-restart`. Para volver al
estado por defecto: `qa/qa.sh google-restart off`. El `seed` no depende de Google, pero **nunca** debe correrse con el
correo real (se niega); si necesitás datos nuevos: `reset`, `up`, `seed` y recién después `api-restart` / `google-restart`.

Comprobación automática del cableado (no hace login con Google, eso requiere a una persona):
`npx playwright test -c qa/playwright.config.ts google.spec` → con Google apagado verifica que no hay botón; con
Google encendido, que el botón oficial se renderiza en `/login` y `/recuperar-google`; y siempre, que un ID token
falso recibe el 401 genérico sin cookie.

### Pruebas manuales

Cuentas de Google: **A** (nunca usada en QA) y **B** (cuenta con la que vas a hacer la recuperación). La recuperación
manda un correo con el enlace; con el sandbox de Resend solo llega al email de tu cuenta de Resend, así que **B debe
ser esa misma dirección** y ser una cuenta de Google (o tener un dominio verificado en Resend). Para esa prueba el
correo real tiene que estar activo (`qa/qa.sh api-restart`).

1. **Botón oficial visible.** `http://localhost:5174/login` muestra “Continuar con Google” debajo del formulario, y
   `/recuperar-google` también. Sin Client ID (o apagado) no aparece nada.
2. **Registro con una cuenta Google nueva (A).** Botón → elegí A → aparece “No hay una cuenta para A. ¿Quieres
   crearla…?” → *Crear cuenta*. Entrás a Inicio con “Creá tu espacio de trabajo” (no se crea ninguna organización ni rol).
   Cancelar en ese paso no crea nada. Comprobación opcional:
   `docker exec -i caa_qa_postgres psql -U qa_user -d caa_qa -c "select email, google_sub is not null as vinculado from usuarios where email='A'"`.
3. **Login posterior (A).** Cerrar sesión → botón → entra directo, sin pedir confirmación.
4. **Rechazo de vinculación automática por email (B).** Creá primero una cuenta común con el email de B
   (*Crear cuenta*, email y contraseña). Cerrá sesión y probá el botón con B: aparece “No pudimos ingresar con esa
   cuenta de Google…” con el enlace “Recuperar el acceso con Google”. No se inició sesión ni se vinculó nada
   (`vinculado` sigue en `f`) y B puede seguir entrando con su contraseña.
5. **Recuperación con doble verificación (B).** Desde ese enlace: botón con B → “Revisa tu correo”. Llega el correo
   de recuperación; abrí su enlace (el token sale de la barra de direcciones), elegí una contraseña nueva con su
   confirmación y confirmá con el botón de Google **con la misma cuenta B**: entrás a Inicio. Después, con B funcionan
   el botón de Google y la contraseña nueva (la anterior ya no). Con otra cuenta de Google, con un enlace usado o
   vencido, o repitiendo la contraseña actual, el resultado es el mensaje genérico de “No se pudo recuperar el acceso…”.
6. **Retorno a invitaciones pendientes (A).** `owner@qa.test` → Centro Sol → Miembros → *Invitar* a A (rol Miembro).
   Para no depender del correo: `qa/qa.sh plant-invitation A qa-google-invitacion-1` imprime un enlace de un solo uso.
   Con la sesión cerrada, abrí ese enlace → pasa a Login (el token sale de la URL) → “Continuar con Google” con A →
   volvés a “Aceptar invitación” con la cuenta A **sin aceptarse sola** → aceptá → “Ya formas parte de la organización.”.

Si algo falla: en la consola del navegador, `[GSI_LOGGER]` explica los rechazos de Google (origen no autorizado o
cliente no encontrado → revisá el origen `http://localhost:5174` exacto y el Client ID; “acceso bloqueado” → usuario de
prueba en la pantalla de consentimiento). Un 401 de la API es siempre genérico a propósito (`qa/qa.sh logs`).

## Qué NO se puede probar acá (pendiente con servicios externos)

- **Google (inicio de sesión y recuperación de identidad):** disponible de forma opt-in con tu Client ID (ver la
  sección anterior). El login con Google siempre lo hace una persona; sin Client ID el botón se oculta y solo lo
  cubren pruebas unitarias con mocks más la comprobación de cableado de arriba.
- **Correo real (Resend):** disponible de forma opt-in con el sandbox (ver la sección anterior). Sin eso, el QA usa
  una clave inerte y el camino del enlace se prueba con tokens conocidos plantados en la base de QA.
- **Cloudinary (subida de pictogramas propios):** credenciales inertes; la subida de imágenes no se prueba.

## Defecto del backend encontrado y corregido

`POST /api/invitaciones/aceptar` y la revocación de invitaciones respondían **500** sobre PostgreSQL real: los
`UPDATE` condicionales de `InvitacionRepository` usaban literales de enum en HQL, que Hibernate emite como
`cast(... as estadoinvitacion)` (el tipo real es `estado_invitacion`; H2 lo ocultaba). Se corrigió en el backend
(PR #4, ya en `main`, con un test de regresión contra PostgreSQL 15 real). Este entorno prueba `main` y la
suite `npm run qa:e2e` pasa sin ningún parche.
