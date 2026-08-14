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

## Hallazgos pendientes (deuda priorizada)

### Prioridad 1

- [ ] **`RichTextEditor.vue`**: 7 botones icon-only (negrita, cursiva, lista, alinear L/C/R, imagen)
  sin `aria-label` ni `title`. Solo lectura por lector de pantalla como "botón" sin nombre.
- [ ] **`PaginadorComponent.vue`**: botones anterior/siguiente (`«`/`»`) sin `aria-label`
  (ej. `aria-label="Página anterior"`). Los numéricos sí tienen texto.
- [ ] **`GaleriaImagenes.vue`**: botón de cierre del carousel usa `title="Cerrar"` (no fiable para
  AT); usar `aria-label="Cerrar"`.
- [ ] **`ChatWindow.vue`**: ~12 modales inline (lista miembros, lista canales, crear/editar canal,
  eliminar canal, perfil, confirmar desconexión, confirmación de borrado, baneo/denuncia/silencio…)
  sin foco inicial, sin Esc, sin focus trap ni restauración. Opciones: aplicar `useModalFocus` a cada
  uno o migrarlos a los componentes compartidos (recomendado a medio plazo).

### Prioridad 2

- [ ] **Dropdown del NavBar** y **menús contextuales de `ChatWindow`**: abren sin mover el foco,
  no cierran con `Esc` ni soportan navegación con flechas. Patrón WAI-ARIA `menu`/`menubutton`.
- [ ] **Errores de validación**: los mensajes de error (formularios, editor) no se anuncian con
  `aria-live`; un lector de pantalla no los notifica al aparecer.

### Prioridad 3

- [ ] **Contraste (WCAG AA)**: sin auditoría con herramienta automática (axe/Lighthouse). Revisar
  textos sobre fondos claros y estados `disabled`.
- [ ] **Focus visible**: confirmar que ningún estilo global oculta el `outline`/focus ring.
- [ ] **Etiquetas de formularios**: verificar que todos los `input`/`select`/`textarea` tienen
  `<label>` o `aria-label` asociado (p. ej. `select` de tamaño de fuente en `RichTextEditor`).

## Metodología

- Revisión manual de código de componentes y vistas principales.
- Análisis estático (regex) de botones sin `aria-label` e imágenes sin `alt`.
- No se ejecutaron herramientas automáticas ni pruebas con lector de pantalla en este lote.
