# Diseño de CAA_SP

Sistema visual "B · SaaS moderno" aplicado a autenticación y a todas las pantallas administrativas. La referencia ejecutable fue el prototipo B, retirado del producto: se puede recuperar del historial con `git show 94592f8 --stat`.

## Alcance

- `.caa-brand` (`src/index.css`) mapea las variables de shadcn a la paleta oficial. Lo aplican `AuthLayout` y `PageLayout`.
- `.caa-brand-dark` es la variante del sidebar.
- El Editor y el Modo Uso quedan fuera de ese alcance y conservan su propia apariencia.

## Marca

- Fuente de verdad: paquete `caa-sp-marca` (SVG, PNG, `theme.css`, `LEEME.md`).
- Tipografías: Manrope para títulos e Inter para la interfaz.
- Paleta principal: tinta `#0F1B3D`, azul `#2F5BEA`, cian `#12A594`, niebla `#F4F7FB`, gris `#5B6478`.
- Texto en cian: `#0E7C6F`. El cian `#12A594` es solo un acento gráfico.
- Borde de campos: `#7E8BA3`, variante accesible aprobada (3:1, WCAG 2.2 criterio 1.4.11). `--border` `#DDE3EE` queda para bordes decorativos.

## Piezas compartidas

- `src/layouts/brand.ts`: títulos, panel y acciones.
- `src/components`: `EmptyPanel`, `RowsSkeleton`, `FieldError`, `FormAlert`, `ErrorState`.
- `src/components/ui/nativeSelect.ts`: `<select>` nativo alineado con `Input`.

## Convenciones

- Un `Link` con estilo de botón usa `cn(buttonVariants(...))`: sin `cn`, `border-transparent` anula el borde de `outline`.
- En un pie de formulario en columna, usar `BRAND_FORM_ACTION_CLASS`: `flex-1` colapsa la altura.
- Español argentino con voseo. Objetivo de accesibilidad: WCAG 2.2 AA.
