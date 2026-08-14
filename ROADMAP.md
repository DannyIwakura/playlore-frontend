# Roadmap — PlayLore Frontend

> Documento de planificación por fases. Cada lote terminado se marca completado.
> La Fase 3 se divide en lotes; los que no afectan al frontend (backend) se marcan como N/A aquí y viven en el roadmap del backend.

## Fases

| Fase | Estado |
|---|---|
| F1 — Autenticación, usuarios, personajes, amistades (UI) | ✅ Completada |
| F2 — Chat por canales/WebSocket (UI) | ✅ Completada |
| F3 — Mejora continua (lotes 0-6) | 🔜 En curso |

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

## Decisiones de alcance

- PROHIBIDO `alert()`/`confirm()`/`prompt()` nativos → `ModalAviso.vue`, `ModalConfirmacion.vue`, `ModalInput.vue`.
- No refactorizar `ChatWindow.vue` (≈2.700 líneas) en esta fase; solo cambios puntuales.
- a11y solo crítico (alt, `aria-label`, `type="button"`); no auditoría completa.
- Se conservan los endpoints REST del backend; solo se eliminan funciones muertas del frontend.

## Deuda técnica diferida

- [ ] Refactor de `ChatWindow.vue` en componentes.
- [ ] Code-splitting del bundle (`import()` dinámico; hoy `index.js` ≈1 MB).
- [ ] Auditoría a11y completa (foco, roles ARIA, contraste).
- [ ] Unificar estilos duplicados de `.modal-backdrop-custom`/`.modal-content-custom` en estilos compartidos.

## Verificación estándar

- Build: `npm run build`
- Dev: `npm run dev` (backend esperado en `http://localhost:8080`)
