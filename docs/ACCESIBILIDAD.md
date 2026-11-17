# Informe de Accesibilidad — PlayLore Frontend

> Auditoría de accesibilidad (fase 4, lote 5). Alcance: informe + fixes de foco y teclado en los
> componentes de modal compartidos. No se persigue conformidad completa WCAG en esta fase.
> Documento vivo: cada remediación aplicada se marca y se mueve a "Resuelto".

## Resumen

El frontend cumple lo crítico desde la Fase 3 (alt en imágenes, `aria-label` en carousel de Home,
`type="button"` en NavBar/modales/Paginador/ExpandableText). Este lote añade gestión completa de foco y
teclado a los tres modales compartidos (`ModalAviso`, `ModalConfirmacion`, `ModalInput`) y deja
documentado el resto como deuda priorizada.

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

## Resuelto en el rediseño de UI (fases 2 y 6-8)

| Hallazgo | Resolución |
|---|---|
| `RichTextEditor.vue`: 7 botones icon-only sin `aria-label` ni `title` | Barra `role="toolbar"` con `aria-label` y 4 `role="group"`; cada botón con `aria-label`/`title`, `aria-pressed` en los toggles y `aria-controls` al área editable. El área expone `role="textbox"`, `aria-multiline` y `aria-label` (commit `0e755fb`). |
| `PaginadorComponent.vue`: `«`/`»` sin `aria-label` | `nav[aria-label="Paginación"]`, `aria-label="Página anterior"`/`"Página siguiente"`, `aria-current="page"` y `aria-disabled` en los extremos (commit `0e755fb`). |
| `GaleriaImagenes.vue`: cierre del carousel solo con `title` | `aria-label` en cierre, anterior, siguiente, ampliar y eliminar imagen. |
| `ChatWindow.vue`: modales inline sin foco, `Esc`, trap ni restauración | Migrados a `ModalFormulario`/`ModalConfirmacion`/`ModalAviso`, que usan `useModalFocus` (fase 7). |
| Dropdown del NavBar y menús contextuales del chat sin teclado | `aria-expanded`/`aria-controls` y cierre con `Esc` (fases 2 y 7). |

## Hallazgos pendientes (deuda priorizada)

### Prioridad 1

- Sin pendientes de esta lista: los cuatro hallazgos originales están resueltos.

### Prioridad 2

- [ ] **Errores de validación**: los campos asocian su error con `aria-describedby` mientras existe y
  usan `aria-invalid`, pero falta comprobar el anuncio con lector de pantalla y valorar `aria-live` en
  los errores generales.

### Prioridad 3

- [ ] **Contraste (WCAG AA)**: sin auditoría con herramienta automática (axe/Lighthouse). Los tokens
  `-ink`/`-strong` corrigen los casos detectados a mano, pero falta la pasada completa.
- [ ] **Focus visible**: confirmar que ningún estilo global oculta el `outline`/focus ring fuera de los
  componentes ya revisados.
- [ ] **Etiquetas de formularios**: verificar el resto de `input`/`select`/`textarea`; el `select` de
  tamaño de fuente del editor ya tiene `aria-label`.

## Metodología

- Revisión manual de código de componentes y vistas principales.
- Análisis estático (regex) de botones sin `aria-label` e imágenes sin `alt`.
- No se ejecutaron herramientas automáticas ni pruebas con lector de pantalla en este lote.
