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
qa/qa.sh down     # detiene todo (los datos quedan en el volumen)
qa/qa.sh reset    # borra SOLO el contenedor y el volumen de QA (hay que volver a hacer up + seed)
npm run qa:e2e    # suite Playwright contra este entorno (consume datos: reset + up + seed antes de repetirla)
```

El backend se exporta con `git archive` desde `../CAA_SP` (solo lectura) y se compila en `qa/.work/`
(ignorado por Git). La revisión se elige con `BACKEND_REF` (por defecto `fix/invitaciones-enum-postgres`, que
contiene la corrección de las invitaciones; cuando se integre, usar `BACKEND_REF=main`). No se aplica ningún
parche: se prueba el backend tal como está comiteado.

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

## Qué NO se puede probar acá (pendiente con servicios externos)

- **Google (inicio de sesión y recuperación de identidad):** necesita un `GOOGLE_CLIENT_ID` real en el backend y
  `VITE_GOOGLE_CLIENT_ID` en el frontend, y el origen autorizado en Google Cloud. Sin ellos el botón se oculta.
  Lo cubren solo pruebas unitarias con mocks, no una prueba real contra Google.
- **Correo real (Resend):** el QA usa una clave inerte, así que las invitaciones y los restablecimientos no se
  entregan por email. El camino del enlace se prueba con tokens conocidos plantados en la base de QA.
- **Cloudinary (subida de pictogramas propios):** credenciales inertes; la subida de imágenes no se prueba.

## Defecto del backend encontrado y corregido

`POST /api/invitaciones/aceptar` y la revocación de invitaciones respondían **500** sobre PostgreSQL real: los
`UPDATE` condicionales de `InvitacionRepository` usaban literales de enum en HQL, que Hibernate emite como
`cast(... as estadoinvitacion)` (el tipo real es `estado_invitacion`; H2 lo ocultaba). Se corrigió en el backend
(rama `fix/invitaciones-enum-postgres`, con un test de regresión contra PostgreSQL 15 real). Este entorno ya
prueba esa versión y la suite `npm run qa:e2e` pasa sin ningún parche.
