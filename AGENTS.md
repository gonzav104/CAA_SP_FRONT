# AGENTS.md

## Proyecto

CAA_SP_FRONT es el frontend en React de CAA_SP.

Backend relacionado: `../CAA_SP`

El backend es la fuente de verdad para rutas API, DTOs, roles, permisos y formatos de respuesta. No modificarlo salvo pedido explícito.

## Stack

- React + TypeScript + Vite
- React Router
- TanStack Query
- Axios
- React Hook Form + Zod
- Tailwind CSS
- shadcn/ui
- Playwright

No agregar dependencias sin una necesidad clara.

## Arquitectura

Usar organización por features.

```text
src/
├── app/
├── api/
├── components/
├── features/
├── layouts/
└── lib/
```

Mantener el código de dominio cerca de su feature y evitar abstracciones prematuras.

## Estado

Usar TanStack Query para server state.

Usar estado local de React/hooks para interacciones temporales de UI.

No duplicar innecesariamente datos provenientes del servidor.

## API

Usar un único cliente Axios centralizado con `withCredentials: true`.

Nunca guardar JWT en localStorage ni sessionStorage.

No inventar contratos de API. Revisar primero `../CAA_SP`.

## TypeScript

Mantener TypeScript estricto.

Evitar `any` salvo justificación técnica.

## UI

Existen dos experiencias distintas:

- Dashboard: interfaz SaaS profesional; shadcn/ui es apropiado.
- Modo Uso: interfaz CAA específica; simplicidad y accesibilidad tienen prioridad sobre patrones genéricos.

Los requisitos de producto del Modo Uso están en `docs/MODO_USO.md`.

## Calidad

Antes de finalizar cambios relevantes:

- ejecutar typecheck;
- ejecutar lint;
- ejecutar tests relacionados;
- ejecutar build cuando corresponda;
- revisar el diff.

No dejar logs temporales ni cambios no relacionados