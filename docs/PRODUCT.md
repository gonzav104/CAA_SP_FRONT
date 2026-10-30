# PRODUCT.md

<!-- impeccable:product-schema 1 -->

## Platform

web

Aplicación web (React + Vite) que se usa en escritorio y en móvil; no hay app nativa.

## Users

### Equipo de un espacio

Un **espacio** es una organización (consultorio, institución o práctica individual). Cada persona del equipo tiene dos atributos independientes:

- **rol de gestión:** Propietario, Administrador o Miembro (decide quién administra el espacio, invita y cambia roles);
- **capacidad clínica:** si es terapeuta. Un terapeuta atiende solo a los pacientes a los que está asignado.

El terapeuta gestiona pacientes, crea y configura cartillas, agrega pictogramas, define los textos hablados, organiza categorías, invita familiares y registra sesiones. Quien administra el espacio gestiona además miembros, invitaciones y asignaciones de terapeutas.

### Familiar

Persona vinculada a un paciente concreto, con permiso de **solo lectura** o de **edición limitada**. No pertenece al espacio, ve únicamente los pacientes compartidos con ella y no tiene un portal propio: usa la misma aplicación con lo que su permiso habilita.

### Persona usuaria de CAA

Usa el **Modo Uso** para comunicarse. No interactúa con funciones administrativas.

## Product Purpose

CAA_SP es una aplicación de Comunicación Aumentativa y Alternativa para niños y personas con dificultades de comunicación. Permite que una persona exprese necesidades, respuestas e intenciones de forma simple mediante pictogramas y voz, mientras su equipo terapéutico y su familia preparan y acompañan ese uso.

## Operating Context

Recorridos reales de la aplicación:

- **Acceso:** inicio de sesión con email y contraseña o con Google; registro; recuperación de contraseña; recuperación de identidad Google; aceptación de invitaciones desde el enlace recibido por correo (nunca automática).
- **Inicio:** saludo, resumen con la cantidad de pacientes, “Tus espacios” (o la creación del primer espacio cuando no hay ninguno) y pacientes compartidos como familiar.
- **Pacientes:** directorio con búsqueda y filtro por espacio; alta de pacientes dentro de un espacio.
- **Espacio de un paciente:** Cartillas (con cartilla principal), Editor, Modo Uso, Sesiones, Familia, Equipo y Pictogramas propios. Cada sección aparece según lo que la persona puede hacer con ese paciente.
- **Miembros del espacio:** lista del equipo, roles, capacidad clínica e invitaciones pendientes.

## Capabilities and Constraints

- Autenticación: email y contraseña, Google, registro, recuperación de contraseña y de identidad Google; la sesión vive en una cookie httpOnly.
- Permisos: el backend es la autoridad. La interfaz decide qué mostrar a partir de las capacidades de cada paciente (editar contenido, gestión clínica, administrar) y del rol de gestión en el espacio; nunca de roles globales.
- Cartillas con categorías, pictogramas globales (ARASAAC) y propios, texto hablado configurable, Modo Uso con voz.
- Sesiones del terapeuta, invitaciones familiares y de organización, asignación de terapeutas por paciente.
- Interfaz en español.
- No prioritario por ahora: IA predictiva, recomendaciones automáticas, gamificación, estadísticas avanzadas, chat, reorganización automática de pictogramas y construcción compleja de frases. Se evaluarán después de validar el uso real.
- Interfaz en español argentino, con voseo. Las pantallas todavía no migradas conservan textos en tuteo hasta su rediseño.

## Brand Commitments

- Nombre: **CAA_SP**.
- Identidad definitiva: **Propuesta A · “Grilla de diálogo”**. No se genera otro logotipo ni se cambia la marca.
- Paquete de marca: `caa-sp-marca` (`~/proyectos/caa-sp-marca`, idéntico a `caa-sp-marca.zip`): SVG del logotipo, isotipo e iconos; PNG de favicons e iconos; `theme.css` con los tokens de color y tipografía; `LEEME.md` con las reglas de uso (zona de respeto, tamaños mínimos, cian solo como acento gráfico y prohibiciones sobre el símbolo).

## Evidence on Hand

- El producto real: sus pantallas, recorridos y textos.
- No existen métricas de uso, clientes, testimonios ni casos publicados. No se inventan. Los datos de QA son ficticios y no se presentan como reales.

## Product Principles

- La complejidad está en la configuración del terapeuta, no en la interfaz de comunicación.
- Una necesidad frecuente se expresa, siempre que sea posible, con una sola interacción (quiero ir al baño, tengo hambre, tengo sed, no quiero, me molesta, necesito ayuda).
- Una sola aplicación para equipo y familia: cada persona ve lo que su vínculo con el paciente le permite.
- La autorización la decide el backend; la interfaz solo refleja lo que el servidor habilita.
- Éxito: reducir la cantidad de pasos y el esfuerzo necesarios para que una persona exprese lo que necesita.

## Accessibility & Inclusion

Quienes se comunican con CAA_SP tienen dificultades de comunicación y usan el Modo Uso; el equipo y las familias que administran pueden no ser usuarios técnicos. El objetivo de cumplimiento es WCAG 2.2 AA.
