# Informe de Accesibilidad — PlayLore Frontend

> Auditoría de accesibilidad (fase 4, lote 5). Alcance: informe + fixes de foco y teclado en los
> componentes de modal compartidos. No se persigue conformidad completa WCAG en esta fase.
> Documento vivo: cada remediación aplicada se marca y se mueve a "Resuelto".

## Resumen

El frontend cumple lo crítico desde la Fase 3 (alt en imágenes, `aria-label` en carousel de Home,
`type="button"` en NavBar/modales/Paginador/ExpandableText). Este lote añade gestión completa de foco y
teclado a los tres modales compartidos (`ModalAviso`, `ModalConfirmacion`, `ModalInput`) y deja
documentado el resto como deuda priorizada.

La Fase 10 cierra la deuda de contraste, tamaño de texto, objetivos táctiles, nombres accesibles,
imágenes pesadas y CLS con una auditoría automática sobre 13 rutas a 1280 y 375 px. Queda pendiente la
prueba manual con lector de pantalla y el `srcset` del hero móvil.

## Resuelto en este lote

| Hallazgo | Antes | Ahora |
|---|---|---|
| Modales sin foco inicial | El foco quedaba en `body` o en el elemento de origen | El foco se mueve al diálogo (o al input con `autofocus`) al abrir |
| Sin cierre con teclado | Esc no hacía nada | `Esc` cierra el modal (listener scoped al contenedor, sin interferir con ChatEditor/GaleriaImagenes) |
| Sin bloqueo de Tab (focus trap) | Tab salía al resto de la página | `Tab`/`Shift+Tab` cicla entre elementos enfocables del diálogo |
| Sin restauración de foco | Al cerrar, el foco quedaba perdido | Al desmontar se restaura el foco al elemento que abrió el modal |
| Sin semántica ARIA | El diálogo era un `div` sin rol | `role="dialog"` + `aria-modal="true"` + `aria-label` con el título |
| Botón de cierre sin nombre accesible | `btn-close` (X) sin `aria-label` | `aria-label="Cerrar"` |

Implementación: composable compartido `src/composables/useModalFocus.ts` (trap + Esc + restore) usado
por los tres modales.

## Resuelto en el rediseño de UI (fases 2 y 6-9)

| Hallazgo | Resolución |
|---|---|
| `RichTextEditor.vue`: 7 botones icon-only sin `aria-label` ni `title` | Barra `role="toolbar"` con `aria-label` y 4 `role="group"`; cada botón con `aria-label`/`title`, `aria-pressed` en los toggles y `aria-controls` al área editable. El área expone `role="textbox"`, `aria-multiline` y `aria-label` (commit `0e755fb`). |
| `PaginadorComponent.vue`: `«`/`»` sin `aria-label` | `nav[aria-label="Paginación"]`, `aria-label="Página anterior"`/`"Página siguiente"`, `aria-current="page"` y `aria-disabled` en los extremos (commit `0e755fb`). |
| `GaleriaImagenes.vue`: cierre del carousel solo con `title` | `aria-label` en cierre, anterior, siguiente, ampliar y eliminar imagen. |
| `ChatWindow.vue`: modales inline sin foco, `Esc`, trap ni restauración | Migrados a `ModalFormulario`/`ModalConfirmacion`/`ModalAviso`, que usan `useModalFocus` (fase 7). |
| Dropdown del NavBar y menús contextuales del chat sin teclado | `aria-expanded`/`aria-controls` y cierre con `Esc` (fases 2 y 7). |
| Movimiento sin respeto a `prefers-reduced-motion` | Tokens `--pl-duration-*`/`--pl-ease-*`; el desplazamiento espacial y las animaciones continuas viven en `@media (prefers-reduced-motion: no-preference)`; esqueletos y spinners se detienen con `reduce`; la entrada se limita a `.pl-animate-in` y al hero (fase 9). |

## Resuelto en la Fase 10 (auditoría de calidad)

Auditoría en tiempo de ejecución con Playwright/Chromium sobre 13 rutas (`/`, `/login`, `/registro`,
`/dashboard`, `/personajes`, `/personajes/buscar`, `/perfil/7`, `/personaje/3`, `/amigos`, `/chat`,
`/admin`, `/admin/categorias`, `/admin/categorias/nueva`) a 1280 y 375 px, con `token` JWT de prueba
e interceptación de `**/api/**`. Además, cálculo WCAG de los pares de tokens usados y análisis estático
de `alt`, `aria-label` y etiquetas.

| Hallazgo | Resolución | Medición |
|---|---|---|
| 2 `<img>` de `ChatWindow.vue` sin `alt` (selector de personajes y resultados de búsqueda) | `alt=""` decorativo: el nombre del personaje ya va en texto adyacente | 0 imágenes sin `alt` en el análisis estático |
| Buscador del chat sin etiqueta | `aria-label="Buscar en el canal"` en el `input` y en el botón de buscar | 0 controles sin nombre accesible |
| Botones icon-only del chat (buscar, cerrar buscador, ir al último mensaje) solo con `title` | `aria-label` explícito y `aria-hidden="true"` en los iconos | 0 botones/enlaces icon-only sin nombre |
| Badge de `NavBar` con `--pl-danger` + texto blanco (3.9:1) | `--pl-danger-strong` (5.0:1) y tamaño a 0.75rem | AA en texto normal |
| `.brand-wordmark__accent` y `.pl-hero-meta i` con `--pl-cyan` sobre blanco (2.17:1) | `--pl-cyan-ink` en el logotipo; el icono del hero va sobre fondo oscuro (7.5:1) y se mantiene | AA |
| `.pl-kicker--light` con `--pl-muted` sobre fondo oscuro | `rgba(255, 255, 255, 0.78)` | AA sobre `--pl-dark` |
| Utilidades Bootstrap `.text-primary/success/warning/danger/info` con el color base (2.1-3.1:1) | Sobrescritas globalmente a sus variantes `-ink` | AA en los 5 casos |
| `TarjetaPersonaje`: el enlace estirado ocultaba el anillo de foco | `outline` en la tarjeta con `:has(.personaje-card__link:focus-visible)` | 18/18 elementos con foco visible en `/dashboard` |
| `RichTextEditor`: `font-size: 16px` literal | `1rem` | Consistente con el sistema |
| Textos legibles por debajo de 12 px (horas, metadatos, badges del chat, chips, bio) | Subidos a 0.75rem en `ChatEditor`, `ChatMessage`, `ChatWindow`, `AnadirCategoriaForm`, `PerfilPersonajeView`, `PerfilUsuario` y `style.css` | Solo quedan el caret (9.6 px) y la X del chip, ambos iconos |
| Indicadores del carrusel de Home a 23 px de alto | `min-height: 24px` | 0 objetivos táctiles reales por debajo de 24 px |
| Imágenes de 3-13 MB (`login-bg`, `carrusel2`, `register-bg`, `playlore_right`, `AVATAR`) | Redimensionadas con Pillow (calidad 82, progresivo) y `AVATAR` a 640x640 | ~30.9 MB → ~1.6 MB |
| CLS 0.1238 en `/personaje/3` | El footer no se pinta durante la carga (el esqueleto dejaba el footer a la vista y luego saltaba fuera) | CLS 0 en escritorio y móvil |
| Salto de la navbar por el intercambio de la fuente de iconos (`font-display: block`) | Ancho de icono reservado (`width: 1em`) en los enlaces y precarga del `woff2` desde `main.ts` | CLS de la navbar de 0.0004 a 0 |
| Reflujo al aparecer la barra de scroll | `scrollbar-gutter: stable` en `html` | `clientWidth` estable en 1265/360 |

Resultado de la pasada final: 0 scroll horizontal en las 13 rutas a 1280 y 375; 0 violaciones de
contraste calculables (se omiten fondos con degradado o imagen, donde el color real no es fiable);
CLS ≤ 0.0005 en todas las rutas salvo `/chat` (0.0088 escritorio, 0.0247 móvil, por el centrado
vertical de la selección de personaje al llegar los datos) y ambos por debajo de 0.1; 0 errores de
página.

## Hallazgos pendientes (deuda priorizada)

### Prioridad 1

- Sin pendientes de esta lista: los cuatro hallazgos originales están resueltos.

### Prioridad 2

- [ ] **Errores de validación**: los campos asocian su error con `aria-describedby` mientras existe y
  usan `aria-invalid`, pero falta comprobar el anuncio con lector de pantalla y valorar `aria-live` en
  los errores generales.

### Prioridad 3

- [ ] **Prueba con lector de pantalla real**: la auditoría es automática (Playwright + cálculo WCAG);
  falta una pasada manual con NVDA/VoiceOver.
- [ ] **Imágenes del hero móvil**: `carrusel1.jpg` (1333 px) se muestra a 360 px de ancho; valorar
  `srcset` si se añaden más densidades. `playlore_right.jpg` y `AVATAR.png` quedan a ~2x del tamaño
  mostrado, correcto para pantallas de alta densidad.

## Metodología

- Revisión manual de código de componentes y vistas principales.
- Análisis estático (regex) de botones sin `aria-label` e imágenes sin `alt`.
- Auditoría en tiempo de ejecución con Playwright: contraste calculado sobre el fondo compuesto real,
  tamaño de texto renderizado, objetivos táctiles, scroll horizontal, CLS con sus fuentes y recorrido
  de teclado.
- Cálculo WCAG de los pares de tokens (`--pl-*`, `-ink`, `-strong` y tintes) con la fórmula de
  luminancia relativa.
- No se ejecutaron pruebas con lector de pantalla.
