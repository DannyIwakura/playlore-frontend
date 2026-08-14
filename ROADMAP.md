# Roadmap — PlayLore Frontend

> Documento de planificación por fases. Cada lote terminado se marca completado.
> La Fase 3 se divide en lotes; los que no afectan al frontend (backend) se marcan como N/A aquí y viven en el roadmap del backend.

## Fases

| Fase | Estado |
|---|---|
| F1 — Autenticación, usuarios, personajes, amistades (UI) | ✅ Completada |
| F2 — Chat por canales/WebSocket (UI) | ✅ Completada |
| F3 — Mejora continua (lotes 0-6) | ✅ Completada |
| F4 — Deuda diferida (lotes 0-7) | ✅ Completada |
| F5 — Calidad de ingeniería + mejoras de producto (en curso) | 🚧 |

## Fase 5 — checklist por lote

| Lote | Descripción | Estado |
|---|---|---|
| L0 | CI/CD: GitHub Actions (typecheck + lint + test + build) en cada push/PR a `main` | ✅ |
| L1 | Tests frontend: cobertura de composables de chat y utilidades (99 tests iniciales) | ✅ |
| L2 | Tests backend (solo backend, Mockito) | N/A frontend |
| L3 | Búsqueda de mensajes por canal: buscador en la cabecera de `ChatWindow` con salto al resultado (`useChatBusqueda`) | ✅ |
| L4 | Notificaciones fuera de foco: `notificarPush` solo cuando `document.hidden` + auto-eliminación de cuenta con contraseña en "Zona de peligro" (`ModalInput` type password) | ✅ |
| L5 | Auditoría de moderación (backend + vista en `AdminPanel`) | ⏳ |
| L6 | Roadmap/AGENTS: cierre de fases y deuda documentada | ⏳ |

## Decisiones de alcance (Fase 5)

- Notificaciones: la notificación nativa solo se muestra con la pestaña fuera de foco (`document.hidden`)
  y permiso concedido. Web Push con Service Worker queda documentado como deuda (requiere backend de push).
- Auto-eliminación: se pide la contraseña con `ModalInput` tras la confirmación; el backend la verifica con BCrypt.

## Fase 3 — checklist por lote

| Lote | Descripción | Estado |
|---|---|---|
| L0 | Higiene: `console.log` de debug, redirect huérfano `/mensajes`, carpeta `src/pages/Canales/` vacía, 8 funciones muertas de `chatApi.ts` | ✅ |
| L1 | Seguridad (solo backend) | N/A frontend |
| L2 | UX: eliminar `prompt()` nativos (`ModalInput.vue` en `RichTextEditor.vue`, modal de enlace en `ChatEditor.vue`) + a11y crítico (alt en imágenes, `aria-label` en carousel Home, `type="button"` en NavBar/modales/Paginador/ExpandableText) | ✅ |
| L3 | Rendimiento (solo backend) | N/A frontend |
| L4 | Admin: botón "Banear objetivo" en el detalle de denuncia (`POST /moderacion/baneos`) | ✅ |
| L5 | Documentación: AGENTS.md actualizado con convenios nuevos | ✅ |
| L6 | Roadmap (este archivo) | ✅ |

## Fase 4 — checklist por lote

| Lote | Descripción | Estado |
|---|---|---|
| L0 | Code-splitting del bundle (`import()` dinámico del router) | ✅ |
| L1 | Unificar estilos de `.modal-backdrop-custom`/`.modal-content-custom` en `src/style.css` + overrides específicos (ChatWindow, ChatEditor, DenunciasLista) | ✅ |
| L2 | Rendimiento (solo backend: batch de denuncias) | N/A frontend |
| L3 | Auto-eliminación de cuenta: "Zona de peligro" en `EditarFormulario.vue` (backend ya expone `DELETE /usuarios/{id}` para ADMIN/MOD) | ✅ |
| L4 | Refactor de `ChatWindow.vue`: extracción de 5 composables (presencia, mensajes, privado, moderación, denuncias) con inyección de dependencias; plantilla intacta; script de 1546 → ~810 líneas | ✅ |
| L5 | Accesibilidad: composable `useModalFocus` (trap + Escape + restauración + `role="dialog"`/`aria-modal`) en modales compartidos + informe `docs/ACCESIBILIDAD.md` | ✅ |
| L6 | Presencia (solo backend: `log.warn` en `PresenceService`) | N/A frontend |
| L7 | Roadmap (este archivo y el del backend) | ✅ |

## Decisiones de alcance

- PROHIBIDO `alert()`/`confirm()`/`prompt()` nativos → `ModalAviso.vue`, `ModalConfirmacion.vue`, `ModalInput.vue`.
- En Fase 4 `ChatWindow.vue` se refactoriza solo extrayendo composables (la plantilla queda intacta); no se extraen componentes.
- a11y: informe + foco/teclado en modales compartidos; el resto se documenta en `docs/ACCESIBILIDAD.md` (no WCAG completa).
- Se conservan los endpoints REST del backend; solo se eliminan funciones muertas del frontend.

## Deuda técnica diferida

- [ ] Refactor de `ChatWindow.vue` en componentes (hecho: composables; pendiente: template de ~2.000 líneas).
- [ ] a11y pendiente del informe `docs/ACCESIBILIDAD.md` (botones icon-only, modales inline de ChatWindow, dropdowns/context menus, `aria-live`, contraste).
- [ ] Verificación visual/E2E de los modales compartidos tras añadir gestión de foco.
- [ ] Web Push con Service Worker para notificar con la pestaña cerrada (requiere backend de push con VAPID).

## Verificación estándar

- Build: `npm run build`
- Dev: `npm run dev` (backend esperado en `http://localhost:8080`)
