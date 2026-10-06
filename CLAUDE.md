# CLAUDE.md

Leer `AGENTS.md` antes de realizar cambios relevantes.

Para comportamiento de producto, leer también la documentación correspondiente dentro de `docs/`.

## Flujo de trabajo

Antes de editar:

1. entender el requerimiento;
2. inspeccionar el código relacionado;
3. revisar `../CAA_SP` si la tarea depende de la API;
4. realizar el cambio mínimo coherente;
5. verificar el resultado.

No rediseñar ni refactorizar áreas no relacionadas.

## Backend

No inventar endpoints, campos de DTO ni permisos.

Revisar el código real del backend cuando sea necesario.

No modificar `../CAA_SP` salvo pedido explícito.

## Engram

Guardar únicamente información duradera:

- decisiones arquitectónicas;
- decisiones UX importantes;
- convenciones;
- restricciones.

No guardar comandos rutinarios, logs ni información temporal de debugging.

## Gentle AI

Usarlo para features importantes, especificaciones y revisiones.

No aplicar procesos pesados a cambios triviales.

## Figma

Cuando exista un diseño aprobado en Figma, tratarlo como referencia visual principal.

No desviarse sin una razón técnica, de accesibilidad o de producto.

## Implementación

Preferir soluciones simples y mantenibles.

No introducir stores globales, abstracciones o dependencias sin una necesidad demostrada.

Usar TanStack Query para server state y estado local para interacción de UI.

## Validación

Usar Playwright para flujos importantes de usuario.

No afirmar que una verificación pasó si no fue ejecutada.

Antes de terminar trabajos significativos, revisar `git diff`.

No usar comandos Git destructivos ni sobrescribir cambios del usuario ajenos a la tarea.