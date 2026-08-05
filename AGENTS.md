## Goal
Build a real-time chat system with connected members sidebar, status colors, role icons, context menu actions (profile, DM, promote, expel), private messaging, channel images, and expandable descriptions.

## Constraints & Preferences
- List shows only characters with active session AND membership in the channel
- Must update in real-time when characters connect/disconnect (both "Desconectar" button and tab close)
- Backend must reliably track WebSocket presence (CONNECT/DISCONNECT) even on abrupt tab closure
- Characters using the UI's internal character tabs (button "+", not browser tabs) must all appear as connected even though only one WebSocket is active at a time
- Closing a character's UI tab must immediately remove them from the sidebar
- Owners first, then admins, then mods, then members in the connected list
- OWNER gets key icon, MOD gets shield icon
- Status (Conectado/Ausente/Ocupado/No Molestar) persists across tab switches but defaults to "conectado" on first connect
- Status must be visible by other characters in real-time
- Messages cached per character so switching tabs doesn't reload them
- Context menu actions: Perfil (always), Mensaje Privado (opens PM section), Ascender a moderador (OWNER/ADMIN only on MEMBER targets), Expulsar del canal (OWNER/ADMIN/MOD on non-self, not on OWNER/ADMIN)
- MOD cannot expel OWNER or ADMIN
- Context menu must not overflow outside viewport
- Private messages use the chat WebSocket system (`/chat/privado`), not the old user messaging

## Progress
### Done
- Backend: `PresenceService.characterStatus` map stores per-character status in memory
- Backend: `putIfAbsent` on connect sets default "conectado" only if no status exists; status NOT removed on disconnect so it persists across WS reconnects
- Backend: `PUT /personajes/{id}/status` endpoint in `PresenceController`
- Backend: `broadcastPresence()` includes `status` field in `PresenceDTO`
- Backend: `MiembroCanalDTO` has new `status` field; `CanalService.listarMiembros()` populates it from `presenceService.getStatus()`
- Frontend: `chatApi.actualizarStatus()` calls `PUT /personajes/{id}/status`
- Frontend: `cambiarEstado()` now async, sends status to backend
- Frontend: Presence subscription updates `statusMap` from broadcast `data.status`
- Frontend: `cargarMiembrosOnline()` populates `statusMap` from API response `m.status`
- Frontend: `.online-dot` uses `:style="{ background: getStatusColor(statusMap.get(m.personajeId)) }"` instead of hardcoded green
- Frontend: `getStatusColor()` helper in both ChatWindow and CanalChat
- Frontend: `guardarEstadoSesion()` now saves `status`, `mensajes`, `pagina`, `hayMasMensajes`, `usuarioScrolledUp` per character
- Frontend: `restaurarEstadoSesion()` restores all cached fields (no more reset to `[]`)
- Frontend: `reconectarSesion()` skips API reload if `mensajes.value.length > 0`
- Frontend: Connected members sorted by role (OWNER→ADMIN→MOD→MEMBER) with icons
- Frontend: `@contextmenu.prevent` on connected member items opens a positioned context menu
- Frontend: Context menu overlay to close on outside click; position clamped to viewport bounds (`Math.min(e.clientX, maxX)`)
- Frontend: Context menu options: Perfil (`verPerfil`), Mensaje Privado (`abrirConversacionPrivada`), Ascender a moderador (`cambiarRol(..., 'MOD')`), Expulsar del canal (`expulsarMiembro`)
- Frontend: Admin actions check `miRolEnCanal` and target `m.rol`; MOD can only expel (not promote); OWNER/ADMIN cannot be expelled
- Frontend: PM sidebar section ("Mensajes Privados") in ChatWindow showing conversation list with avatars, last message preview, unread badge
- Frontend: PM main area with conversation header, message bubbles (reuses same CSS), input sending via `websocketService.sendPrivateMessage()`
- Frontend: `conversacionesPrivadas` ref built by grouping `obtenerConversaciones()` API response by other character
- Frontend: `seleccionarConversacion()` loads messages via `obtenerConversacion()` and shows in main area; clears `canalActivo` so main area switches to PM view
- Frontend: `seleccionarCanal()` clears `conversacionActiva` so main area switches back to channel view
- Frontend: Real-time PM subscription via `subscribeToPrivateMessages()` — if active conversation matches, appends message; otherwise increments unread count
- Frontend: `noLeidosPriv` map drives badge counts in sidebar
- Frontend: Old `pmModalTarget` / PM modal removed from ChatWindow (replaced by sidebar-based PM system)
- Frontend: PM main area template with header (avatar, name, perfil button), message bubbles, and input with `handleKeydownPriv`
- Frontend: Empty-state condition changed to `!canalActivo && !conversacionActiva`
- CanalChat.vue: context menu + profile modal + admin actions + status colors (keeps own PM modal for standalone route)
- Bugfix: MOD can no longer expel OWNER or ADMIN (both ChatWindow and CanalChat)
- Bugfix: Context menu position now stays within viewport bounds
- Bugfix: `subscribeToPrivateMessages(charId, callback)` was called without `charId` argument — fixed to pass `personajeId`
- Bugfix: PM WebSocket subscription changed from `/user/queue/privado` to `/topic/privado.{characterId}` — Spring user destination resolution was unreliable; now uses same direct topic pattern as channel messages
- Bugfix: `guardarEstadoSesion`/`restaurarEstadoSesion` now save/restore `conversacionActiva` and `mensajesPrivados` per character
- Bugfix: Server-side PM delivery changed from `convertAndSendToUser` to `convertAndSend("/topic/privado." + receptorId, dto)` — bypasses `UserDestinationResolver` which wasn't finding sessions
- Bugfix: `enviarMensajePrivadoWs` now increments `noLeidosCharacter` locally for same-session recipient characters (since sender no longer receives topic echo)
- Bugfix: PM and Presence subscriptions were stored in `wsSubscriptions` which `suscribirCanales()` wipes on every channel change (join/create/leave/session switch) — separated into `persistentSubscriptions` so PM callback survives and notifications (sound + yellow highlight) work for messages from other users
- Debug `console.log` statements removed from PM subscription callback in ChatWindow.vue
- Backend: `Canal` entity has `imagenUrl` field (column `imagen_url`, nullable)
- Backend: `CanalDTO` includes `imagenUrl` mapped from entity
- Backend: `PUT /canales/{id}/imagen` endpoint — upload channel image (OWNER/ADMIN only)
- Backend: `DELETE /canales/{id}/imagen` endpoint — remove channel image
- Backend: `CanalService.actualizarImagen()` validates type (jpeg/png/webp), dimensions (max 400x400), stores in `uploads/canales/`
- Frontend: `ExpandableText.vue` component — collapsible text with `-webkit-line-clamp`, "Expandir/Contraer" button, scroll on expand (max-height 300px)
- Frontend: `canalAvatar()` in `chatUtils.ts` accepts `{ nombre, imagenUrl }` or `string` — returns uploaded image URL or falls back to `ui-avatars.com` initials
- Frontend: `chatApi.subirImagenCanal(canalId, file)` and `chatApi.eliminarImagenCanal(canalId)` endpoints
- Frontend: Channel creation modals (CanalesList.vue + ChatWindow.vue) include image upload with preview
- Frontend: Channel cards in CanalesList.vue now show avatar images
- Frontend: Channel descriptions replaced with `ExpandableText` in CanalesList.vue, ChatWindow.vue header, and CanalChat.vue header
- Backend: `PermisoCanal.EDITAR_CANAL` permission added (OWNER + ADMIN)
- Backend: `EditarCanalDTO` with nombre, descripcion, privado validations
- Backend: `CanalService.editarCanal()` verifies EDITAR_CANAL permission before updating
- Backend: `PUT /canales/{id}` endpoint for editing channel details
- Frontend: `chatApi.editarCanal(canalId, data)` calls `PUT /canales/{id}`
- Frontend: Edit button (pencil icon) in ChatWindow.vue header — visible for OWNER/ADMIN only
- Frontend: Edit button in CanalChat.vue header — visible for OWNER/ADMIN only
- Frontend: Edit button in CanalesList.vue channel cards — visible for OWNER only
- Frontend: Edit modal in all 3 views with name, description, privacy fields pre-filled
- Frontend: After save, updates canalActivo in ChatWindow/CanalCanal, refreshes list in CanalesList

### In Progress
- (none)

### Blocked
- (none)

## Key Decisions
- Status stored in-memory in `PresenceService.characterStatus` (not DB) — simpler; lost on server restart but WS reconnect restores it
- `onDisconnect` does NOT remove `characterStatus` — status persists across WS reconnects so tab-switching preserves it
- `putIfAbsent` in `onConnect` prevents overwriting existing status on reconnect
- Messages cached per character in `sessionCache` to avoid reload on tab switch; `reconectarSesion()` only fetches if `mensajes.value.length === 0`
- PM system built as a sidebar section + main area view (like channels) instead of a separate page; uses chat WS (`/chat/privado`) not the old user messaging system
- Context menu position manually clamped to viewport bounds (`Math.min(x, window.innerWidth - menuWidth)`) to prevent overflow
- MOD can expel but not promote; expel button hidden when target is OWNER or ADMIN
- CanalChat.vue is a standalone route (`/canales/:id`), so it keeps its own PM modal instead of using ChatWindow's sidebar PM system
- PM uses direct topic `/topic/privado.{characterId}` (like channel messages) instead of Spring's `/user/queue/privado` — avoids user destination resolution issues
- `guardarEstadoSesion`/`restaurarEstadoSesion` also save/restore `conversacionActiva` and `mensajesPrivados` per character
- Channel creation is two-step: create channel first (JSON), then upload image via `PUT /canales/{id}/imagen` (MultipartFile) — backend validates type/dimensions
- Channel images stored as `UUID_filename` in `uploads/canales/`, old image deleted on replace, served via `/uploads/**`
- `ExpandableText.vue` uses `-webkit-line-clamp: 3` for collapsed state, `max-height: 300px; overflow-y: auto` for expanded; button visibility toggled via CSS (`text-overflow: ellipsis`)

## Next Steps
1. Test: switch between characters, verify status persists, messages stay cached, context menu works
2. Test: PM flow — open conversation from context menu, send messages, verify real-time delivery
3. Test: admin actions — promote/expel with different roles
4. Fix: Channel creation error "Ha ocurrido un error inesperado" in Playwright — likely image upload issue (test PNG too small)
5. Test: Channel image upload end-to-end (create channel, then upload image via PUT endpoint)
6. Test: /canales page — currently redirects to /dashboard because characterSessionStore is in-memory

## Critical Context

### Testing Setup (Playwright)
- Backend: `http://localhost:8080` (Spring Boot, Eclipse hot-reload)
- Frontend: `http://localhost:5173` (Vite dev server)
- reCAPTCHA: Use test secret `6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe` — always passes with any `captchaToken` value
- Login API: `POST /api/usuarios/login` with `{ "nombre": "AdminMaster", "password": "password", "captchaToken": "test" }` → returns JWT string directly (NOT JSON — raw string)
- Token is stored in `localStorage` as key `"token"` (used by `userStore.ts`, `api.ts`, `router/index.ts`)

#### Full Testing Flow
1. **Get user JWT**: `POST /api/usuarios/login` → response is raw JWT string (not JSON)
2. **Inject token**: Use `context.addInitScript` to set `localStorage.setItem('token', token)` before navigating
3. **Navigate to chat**: `http://localhost:5173/chat`
4. **Connect character**: Click a character button to trigger `iniciarSesionPersonaje()` → returns session JWT
5. **Test channels**: Channels appear after character connects (backend checks `isOnline()` which checks all user's characters)

#### Key Differences: User JWT vs Character Session JWT
- **User JWT** (from `/api/usuarios/login`): Claims `{ sub: "username", id: userId, role, avatar }`. Used for: API endpoints requiring user auth, channel CRUD, user profile.
- **Character Session JWT** (from `iniciarSesionPersonaje()`): Claims `{ sub: personajeId, userId, personajeId, personajeNombre, personajeAvatar, role }`. Used for: chat WebSocket, channel membership, character-specific actions.
- **Critical**: Character session JWT CANNOT be used as user JWT in `localStorage` — `userStore.ts` expects `id` claim (number), character session has `personajeId` (number) but different structure. Always use user JWT for `localStorage.setItem('token', ...)`.

#### Playwright Modal Handling
- Modals (`.modal-backdrop-custom`) block pointer events on underlying elements
- Force clicks on sidebar items when modal is open: `await locator.click({ force: true })`
- Or remove backdrops via `page.evaluate(() => document.querySelectorAll('.modal-backdrop-custom').forEach(e => e.remove()))`
- Channel list modal has two tabs: "Canales oficiales" (admin channels) and "Canales de usuarios" (user-created channels)

#### Playwright Test Script Location
- Scripts: `C:\Users\PC\AppData\Local\Temp\playwright-test-channels.js`
- Run: `node run.js C:\Users\PC\AppData\Local\Temp\playwright-test-channels.js` from Playwright skill dir
- Scripts must use Windows paths (`C:\\Users\\PC\\AppData\\Local\\Temp\\...`)

#### PowerShell API Testing (backend) — CRITICAL
- **NUNCA** probar la API del backend con `curl.exe` pasando JSON entre comillas simples desde PowerShell 5.1: PowerShell elimina las comillas dobles internas y el servidor recibe `{nombre:AdminMaster,...}` → `HttpMessageNotReadableException: JSON parse error: Unexpected character ('n' (code 110)): was expecting double-quote to start property name` → respuesta 500 genérica que parece un bug del backend (NO lo es).
- Usar SIEMPRE `Invoke-RestMethod` con `-Body '{"clave":"valor"}'` (string verbatim en comillas simples), que envía el JSON intacto:
  ```powershell
  $token = Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/usuarios/login" -ContentType "application/json" -Body '{"nombre":"AdminMaster","password":"password","captchaToken":"test"}'
  ```
- El 500 rápido (ms) + ausencia de query en `information_schema.processlist` + traza `HttpMessageNotReadableException` en Eclipse = cuerpo malformado por el cliente, no error de la app.
- Las respuestas de `/personajes/sesion/activas` y `/canales/{id}/miembros/online` son **arrays JSON directos** (`[...]` o `[]`), NO `{value:[...]}` — no hacer `$resp.value`; iterar `$resp | ForEach-Object`.
- Presencia online del canal = WebSocket/STOMP activo (`WebSocketSession[0 current...]` en logs = nadie conectado), independiente de la columna `activa` de `sesiones_personaje`. Una sesión huérfana (`activa=1` sin WS) aparece en `/activas` pero NO en `/miembros/online`. Para limpiar sesiones huérfanas del usuario: `POST /api/personajes/sesion/cerrar-todas` con el user JWT.
- En MySQL por CLI, `activa` es binario: `\0`=inactiva, `\x01`=activa (el `\x01` imprime como carácter de control que rompe la alineación de columnas — no es NULL).

#### Common Issues
- `locator.getAttribute` strict mode: If multiple elements match, use `.first()` or more specific selector
- Channel creation returns "Ha ocurrido un error inesperado": Check if channel already exists from previous test runs (frontend doesn't validate duplicates before API call)
- `characterSessionStore` is in-memory module-level `ref` — sessions persist in ChatWindow but `CanalesList.vue` redirects to `/dashboard` if no active session on mount

#### Playwright Chat Testing — Quick Reference

**Selectors de elementos (NO usar otros):**

| Elemento | Selector correcto | Selector INCORRECTO (no usar) |
|---|---|---|
| Botón conectar personaje | `button:has-text("Conectarse"):visible` | `button:has(img)` — no tiene img |
| Lista de canales (btn) | `button:has-text("Lista de canales"):visible` | — |
| Tab canales usuarios | `button:has-text("Canales de usuarios"):visible` | — |
| Crear nuevo canal (btn) | `button:has-text("Crear nuevo canal"):visible` | — |
| Items de canal en sidebar | `.channel-item:visible` | — |
| Nombre canal en sidebar | `.channel-item:visible .fw-medium` | — |
| **Nombre canal en header** | `.chat-header h6:visible` | `h6:visible` — captura nombre del personaje |
| Botón editar (lápiz) | `button[title="Editar canal"]:visible` | — |
| Modal abierto | `.modal-backdrop-custom:visible` | — |
| Input nombre en modal | `modal.locator('input[type="text"]').first()` | `page.locator('input')` — captura otros |
| Textarea en modal | `modal.locator('textarea').first()` | — |
| Btn Crear en modal | `modal.locator('button:has-text("Crear")').last()` | `.first()` — puede tomar btn del sidebar |
| Btn Guardar en modal | `modal.locator('button:has-text("Guardar")').first()` | — |

**Flujo de prueba paso a paso (copiar y pegar):**

```javascript
const FE = 'http://localhost:5173';
const BE = 'http://localhost:8080';

// 1. LOGIN — obtener User JWT
const lr = await page.request.post(BE + '/api/usuarios/login', {
  data: { nombre: 'AdminMaster', password: 'password', captchaToken: 'test' }
});
const ut = await lr.text();
await ctx.addInitScript(t => localStorage.setItem('token', t), ut);

// 2. NAVEGAR a chat
await page.goto(FE + '/chat', { waitUntil: 'networkidle', timeout: 15000 });
await page.waitForTimeout(2000);

// 3. CONECTAR PERSONAJE — click en btn "Conectarse"
await page.locator('button:has-text("Conectarse"):visible').first().click();
await page.waitForTimeout(5000); // esperar WS + carga de canales

// 4. ABRIR LISTA DE CANALES
await page.locator('button:has-text("Lista de canales"):visible').click();
await page.waitForTimeout(2000);

// 5. TAB CANALES DE USUARIOS
await page.locator('button:has-text("Canales de usuarios"):visible').click();
await page.waitForTimeout(1000);

// 6. CREAR CANAL — abrir modal de creación
await page.locator('button:has-text("Crear nuevo canal"):visible').click();
await page.waitForTimeout(1500);
const createModal = page.locator('.modal-backdrop-custom:visible').first();
await createModal.locator('input[type="text"]').first().fill('Canal Test');
await createModal.locator('textarea').first().fill('Descripcion');
await createModal.locator('button:has-text("Crear")').last().click(); // .last() porque .first() es btn del sidebar
await page.waitForTimeout(4000);

// 7. SELECCIONAR CANAL en sidebar
await page.locator('.channel-item:visible').filter({ hasText: 'Canal Test' }).first().click();
await page.waitForTimeout(2000);

// 8. VERIFICAR BOTÓN EDITAR
const editBtn = page.locator('button[title="Editar canal"]:visible').first();
const editVis = await editBtn.isVisible({ timeout: 3000 }).catch(() => false);
console.log('Edit visible:', editVis);

// 9. ABRIR MODAL EDITAR
await editBtn.click();
await page.waitForTimeout(1500);
const editModal = page.locator('.modal-backdrop-custom:visible').first();
const title = await editModal.locator('h5').first().textContent();
console.log('Modal title:', title); // debe decir "Editar canal"

// 10. VERIFICAR PREFILL
const nameVal = await editModal.locator('input[type="text"]').first().inputValue();
const descVal = await editModal.locator('textarea').first().inputValue();
console.log('Prefill name:', nameVal); // "Canal Test"
console.log('Prefill desc:', descVal); // "Descripcion"

// 11. EDITAR Y GUARDAR
await editModal.locator('input[type="text"]').first().clear();
await editModal.locator('input[type="text"]').first().fill('Canal EDITADO');
await editModal.locator('button:has-text("Guardar")').first().click();
await page.waitForTimeout(2000);

// 12. VERIFICAR HEADER ACTUALIZADO — selector específico
const headerText = await page.locator('.chat-header h6:visible').textContent();
console.log('Header:', headerText); // "Canal EDITADO"
console.log('Updated:', headerText.includes('EDITADO'));
```

**Errores conocidos y cómo evitarlos:**

| Error | Causa | Solución |
|---|---|---|
| No encuentra botón conectar | Usa `button:has(img)` | Usar `button:has-text("Conectarse"):visible` |
| Header verification falla | `h6:visible` captura nombre del personaje "Prueba" | Usar `.chat-header h6:visible` específicamente |
| `/canales` redirige a `/dashboard` | `characterSessionStore` es in-memory, se pierde al navegar | NUNCA ir a `/canales` directamente, siempre desde el chat |
| API channel CRUD falla 403 | Usa User JWT en vez de Character Session JWT | NUNCA hacer CRUD de canales vía API directa, usar la UI |
| Modal btn "Crear" toma btn del sidebar | `.first()` captura el btn equivocado | Usar `.last()` o filtrar por `.modal-backdrop-custom` |
| Canales no aparecen en sidebar | No se esperó suficiente tras conectar personaje | Esperar 5000ms tras click en "Conectarse" |
| `page.evaluate` falla por navigation | Se naviga a otra página durante evaluate | No navegar durante evaluaciones JS |

**Reglas críticas:**
1. **SIEMPRE** usar `addInitScript` para inyectar token ANTES de `page.goto`
2. **NUNCA** usar User JWT para API calls de canales (crear, editar, eliminar) — solo funciona vía UI
3. **NUNCA** navegar a `/canales` directamente — perderás la sesión
4. **SIEMPRE** esperar 5000ms tras conectar personaje
5. **SIEMPRE** usar `.chat-header h6:visible` para verificar nombre del canal, NO `h6:visible`
6. **SIEMPRE** usar `.last()` para botones dentro de modales cuando hay btns con mismo texto en el sidebar

### Bugs Fixed (Aug 2026)
#### Bug 1: Channels don't appear after connecting character ✅ FIXED
- **Root cause**: `CanalService.listarMiembros()` used `isOnlineStrict(pid)` which only checks if the character's OWN WebSocket is connected. In multi-character mode, only one character has an active WS at a time.
- **Fix**: Changed to `isOnline(pid)` which checks if ANY character of the same user is connected.
- **Lesson**: Always consider multi-character/multi-user scenarios when checking online status.

#### Bug 2: Infinite loading when returning to character selector ✅ FIXED
- **Root cause**: `obtenerSesionesActivas()` threw error if any session had an expired JWT, but `cargarPersonajes()` and `cargando.value = false` were in the same try block and never executed.
- **Fix**: Wrapped `obtenerSesionesActivas()` in its own try/catch so `cargarPersonajes()` always runs.
- **Lesson**: Isolate error handling — don't let one failing API call block the entire initialization flow.

#### Bug 3: WebSocket connection fails ✅ FIXED
- **Root cause**: Vite proxy config had `ws: true` which tried to upgrade HTTP to WebSocket. SockJS handles its own transport negotiation via HTTP long-polling, so the WS upgrade interfered.
- **Fix**: Removed `ws: true` from `vite.config.ts` proxy config.
- **Lesson**: SockJS manages its own transport layer — don't let the proxy force WebSocket upgrades.

#### Bug 4: Expired session tokens persist in backend ✅ FIXED
- **Root cause**: `sesionesActivas()` returned all sessions without checking JWT expiration. Old sessions with expired JWTs were shown in the UI, causing 403 errors when trying to use them.
- **Fix**: Backend now decodes JWT and checks `exp` before returning sessions; expired ones are automatically deactivated. Frontend also has `limpiarExpiradas()` as a safety net.
- **Lesson**: Always validate JWT expiration on both frontend AND backend before using sessions.

#### Bug 5: Modal backdrop blocks tab close clicks ✅ FIXED
- **Root cause**: `ejecutarDesconectar()` opened a confirmation modal that blocked pointer events. When called from `handleBeforeUnload`, the modal prevented the `sendBeacon` from completing.
- **Fix**: `ejecutarDesconectar()` is now async — modal closes before async disconnect work starts. `handleBeforeUnload` uses `fetch` with `keepalive: true` instead of `sendBeacon` (which doesn't support custom headers).
- **Lesson**: Modal UI shouldn't block critical lifecycle operations like tab close. Use `fetch({keepalive})` for beacon requests that need custom headers.

#### Bug 6: Deleted message only visible as tombstone for the deleter ✅ FIXED
- **Root cause**: `CanalMensajeService.eliminarMensaje()` marked `eliminado=true` in DB but never broadcast the update, so only the deleting client saw "El mensaje fue eliminado por moderación" (via local update in `ejecutarEliminarMensaje`). Other characters kept the stale cached message. Additionally, `findMensajesByCanal` filtered `eliminado = false`, so the tombstone vanished on any fresh channel load.
- **Fix**:
  - Backend `eliminarMensaje` now broadcasts the updated `MensajeCanalDTO` to `/topic/canal.{canalId}` so all connected clients replace the message in real-time.
  - `MensajeCanalRepository.findMensajesByCanal` no longer filters `eliminado = false` — tombstones persist across reloads (Discord-like).
  - Frontend `refrescarMensajesActivos()` merges server page 0 into the per-character cached `mensajes` (replace by id, insert new chronologically) and is called from `reconectarSesion()` on cached session restore — so a background tab character sees the tombstone after switching back to their tab.
  - WS handler skips unread/mention logic for deleted-message broadcasts on non-active channels; `actualizarNoLeidos()` ignores a tombstone as the "latest" message.
- **Lesson**: Message deletion is a shared state change — must be propagated via WS broadcast AND survive reloads via a persistent tombstone; per-character caches go stale for background tabs since only one WS is active at a time.
- **Tombstone text**: The deciding factor is who DELETED, not who authored. `eliminadoPorModerador=true` (deleter is OWNER/ADMIN/MOD) → "El mensaje fue eliminado por moderación" for everyone. `eliminadoPorModerador=false` (only possible for a MEMBER deleting their own message) → "El mensaje fue eliminado por el usuario" for everyone (incl. the author — the old "Eliminaste este mensaje" special case was removed). Backend sets `eliminadoPorModerador = tienePermiso(ELIMINAR_MENSAJES_AJENOS)` regardless of authorship.

#### Bug 7: Chat editor pickers misplaced and don't close on outside click ✅ FIXED
- **Root cause**: `ChatEditor.vue` had no `<style>` block, so `.emoji-picker`, `.mention-picker-inside` and `.context-menu-overlay` were unstyled. The overlays relied on `.context-menu-overlay` from `ChatWindow.vue`, but that is `<style scoped>` and does NOT apply to ChatEditor's DOM. The mention picker was a flex child inside the `<form>`, so it rendered to the LEFT of the input breaking its width. The emoji/dice pickers rendered in normal flow between the toolbar and the input.
- **Fix** (all in `ChatEditor.vue`):
  - Moved the mention picker out of the `<form>` to sit with the other pickers.
  - Added a scoped `<style>` block: `.emoji-picker`/`.mention-picker-inside` are `position: absolute; bottom: 100%; left: 0; right: 0; z-index: 1090` so they float just ABOVE the formatting toolbar at full width; `.formatting-toolbar` gets `position: relative; z-index: 1085` (stays clickable above the overlay so direct emoji↔dice switching still works); `.context-menu-overlay` is `position: fixed; inset: 0; z-index: 1080` so clicking anywhere outside closes the pickers.
  - Added a document-level `keydown` listener (`onDocumentKeydown`) so `Escape` closes any open picker regardless of focus (editor keydown alone wasn't enough — focus is not always in the editor).
  - Added minimal `.mention-item:hover`/`.mention-highlight` background (were unstyled).
- **Lesson**: Scoped styles don't leak into child components — a component using a class like `.context-menu-overlay` must define its own styles. Pickers in a flex `<form>` break layout; float them absolutely instead.
- **Test**: `playwright-editor-pickers.js` (temp dir) — verifies all 3 pickers render above the toolbar, don't move/shift the input, close on outside click, insert emoji/dice/mention, direct emoji↔dice switch, and Escape closes.

#### Bug 8: "?" Ayuda modal rendered unstyled below the input ✅ FIXED
- **Root cause**: Same as Bug 7 — the Ayuda modal uses `.modal-backdrop-custom`/`.modal-content-custom`, whose styles live in `ChatWindow.vue`'s `<style scoped>` and don't apply to `ChatEditor.vue`. The modal rendered in normal document flow (below the character counter) instead of as a centered overlay.
- **Fix** (all in `ChatEditor.vue`):
  - Removed `position-relative` from `.chat-input` and wrapped toolbar+pickers+form+overlays in a `.chat-editor-pickers-anchor position-relative` container (so the pickers still anchor with `bottom: 100%`).
  - The Ayuda modal is now a direct child of `.chat-input`; since its nearest positioned ancestor is `.chat-main` (`position-relative`), `.modal-backdrop-custom { position: absolute; inset: 0; ... display:flex; align-items:center; justify-content:center }` covers the channel main area and centers the modal within it (per user request: "centro de la pantalla del canal").
  - z-index 2000 so the modal sits above the pickers (user choice).
  - Escape closes it too (`onDocumentKeydown` now also closes `mostrarAyudaEditor`).
  - Added `.help-grid` (2-column grid) + `.help-item`/`.help-key` styles, which were also unstyled.
- **Test**: `playwright-ayuda-modal.js` (temp dir) — backdrop covers the channel main area, modal centered horizontally/vertically in it, not over the input, closes via X / Escape / outside click. `playwright-editor-pickers.js` re-run PASS after the template restructure.

#### Bug 9: Disconnected character still shows in "Conectados" while another same-user character stays online ✅ FIXED
- **Root cause**: `PresenceService.isOnline()` returned `true` if ANY character of the same user had an active WebSocket, WITHOUT checking that the character itself still had an active DB session. When B was disconnected (via the "Desconectar" button → `cerrarSesion` closes the DB session) while A remained connected, `isOnline(B)` still returned `true` because A's WS was up. `CanalService.listarMiembros()` / `listarMiembrosOnline()` therefore kept B in the "Conectados" sidebar for every viewer.
- **Fix** (backend):
  - `SesionPersonajeService.tieneSesionActivaValida(personajeId)` — true if there is an `activa=true` session row for the character whose JWT is not expired (mirrors existing expiry handling).
  - `PresenceService.isOnline()` — the user-wide fallback now ALSO requires `tieneSesionActivaValida(personajeId)`. Own-WS check unchanged (a character with its own live WS is always online, preserving abrupt-tab-close detection).
  - `PresenceService.onConnect()`/`onDisconnect()` re-broadcasts for same-user characters now use `isOnline(otherId)` instead of raw WS session presence, so broadcasted presence matches what `listarMiembros()` reports.
- **Lesson**: The multi-character presence fallback conflated "the user is online" with "this character is connected". The DB session row is the source of truth for who is explicitly connected; the WS only indicates the browser is up. A disconnected character must never inherit online status from a same-user character.
- **Test**: `playwright-presencia.js` (temp dir) — T1: single user connects Prueba (11) + Preuba2 (24) in canal 2 'Principal', tab switch keeps both online (Bug 1 regression), disconnecting Preuba2 removes it from "Conectados" while Prueba stays. T2: AdminMaster (Prueba+Preuba2) + ModeradorAlex (Luciana 17 + Lucio 26) all in canal 2 — each browser sees the 4; disconnecting Lucio in one browser removes him from the list in BOTH browsers in real-time while Luciana stays. Regressions: `playwright-cambio-pestana.js` PASS; `playwright-eliminar-conv-pm.js` N/A (no PM conversations in data, unrelated).

#### Bug 10: Formatting toolbar floats ABOVE modal backdrop (icons stay bright and clickable) ✅ FIXED
- **Root cause**: `ChatEditor.vue`'s floating layers had z-indexes higher than the modal backdrop level used by `ChatWindow.vue`. ChatWindow's `.modal-backdrop-custom` is `position: fixed; inset: 0; z-index: 1050`, but the editor's `.emoji-picker`/`.mention-picker-inside` were 1090, `.formatting-toolbar` 1085 and its `.context-menu-overlay` 1080. So when ANY modal opened, the dark backdrop covered the page but the editor toolbar/pickers sat ABOVE it: the icons stayed bright (not darkened) and received clicks, so `@click.self` on the backdrop never fired and clicking the icons could not close the modal.
- **Fix** (in `ChatEditor.vue` + `ChatWindow.vue`):
  - Lowered ChatEditor's z-indexes BELOW the modal backdrop level (1050), keeping the relative order required by Bug 7 (pickers 1040 > toolbar 1035 > overlay 1030). Now the backdrop covers the toolbar/pickers, darkens them, and a click on them hits the backdrop → closes the modal. The Ayuda modal's own backdrop stays at 2000 (above everything in the editor).
  - Pickers now close automatically when a modal opens: `ChatWindow.vue` computes `cualquierModalAbierto` (OR of all modal refs) and a `watch` dispatches a `window` CustomEvent `pl:modal-abierto`; `ChatEditor.vue` listens for it and calls `cerrarPickers()`. `toggleAyudaEditor()` also closes pickers when the Ayuda modal opens.
- **Lesson**: A full-viewport backdrop must have a HIGHER z-index than every element it must cover, including elements in child components. Keep z-indexes across sibling layers in one global scale with clear levels (modals ≥ 1050, editor overlays < 1050, ChatWindow context menus 1070/1071).
- **Test**: `playwright-modal-cubre-toolbar.js` (temp dir) — PASS: with the "Miembros" modal open, `document.elementFromPoint` over the toolbar returns the `.modal-backdrop-custom` (not a `.fmt-btn`), and clicking the toolbar closes the modal; pickers still float above the toolbar and are switchable (Bug 7 regression); Escape closes pickers; opening Ayuda with a picker open closes the picker; the `pl:modal-abierto` event closes open pickers. Regressions: `playwright-ayuda-modal.js` PASS. Note: `playwright-editor-pickers.js`'s mention-filter step ("Filtrar menciones muestra a Preuba2") only passes when Preuba2 is ONLINE (the mention picker lists `miembrosOnline`) — with sessions cleared, connect Preuba2 first (see `playwright-mention-prebua2.js`).

### Patterns to Remember
- **Multi-character presence**: User can connect multiple characters simultaneously (internal tabs, not browser tabs). Only one character has active WebSocket at a time. Use `isOnline()` (checks all user's characters) not `isOnlineStrict()` (checks only the specific character's WS). `isOnline()` now ALSO requires the character to have an active (non-expired) DB session — a disconnected character does not inherit online status from same-user characters.
- **Session JWT expiration**: Backend must decode JWT and check `exp` field. Don't trust that sessions in DB are still valid.
- **Tab close cleanup**: `navigator.sendBeacon()` doesn't support custom headers. Use `fetch()` with `keepalive: true` instead, or create a dedicated endpoint that accepts the token in the request body.
- **SockJS + Vite proxy**: Don't set `ws: true` in Vite proxy for SockJS endpoints. SockJS handles transport negotiation via HTTP.
- **Error isolation in onMounted**: Wrap each async operation in its own try/catch so one failure doesn't prevent others from completing.
- **Frontend + Backend validation**: Always validate on both sides. Backend cleans up expired sessions; frontend also filters them client-side as safety net.
- **canalAvatar() signature**: `canalAvatar(canal: { nombre: string; imagenUrl?: string } | string)` — accepts object or string, returns uploaded image URL or `ui-avatars.com` initials fallback.
- **Channel image upload**: Two-step process — create channel first (JSON), then upload image via `PUT /canales/{id}/imagen` (MultipartFile). Backend validates type (jpeg/png/webp), dimensions (max 400x400).
- **Channel image storage**: Files saved as `UUID_filename` in `uploads/canales/`. Old image deleted on replace. Served via `UploadConfig` at `/uploads/**`.

### Critical Context
- The chat uses UI-internal character tabs (button "+", not browser tabs) — only ONE character per browser tab has an active WebSocket connection at a time; other characters' sessions exist only in-memory and in the database
- `putIfAbsent` in `onConnect` ensures existing status is not overwritten on WS reconnect
- `guardarEstadoSesion` now saves: `canalActivo`, `canalesUnidos`, `channelLastSeen`, `status`, `mensajes`, `pagina`, `hayMasMensajes`, `usuarioScrolledUp`
- Context menu visibility for admin actions is computed from `miRolEnCanal` (OWNER/ADMIN/MOD) and target `m.rol`
- PM conversations are grouped from ALL messages returned by `listarConversaciones`; the sidebar shows the other character with the latest message preview
- `noLeidosPriv` is a `Map<number, number>` keyed by other character's `personajeId`; incremented on incoming WS message when not in that conversation
- `seleccionarCanal()` clears `conversacionActiva`; `seleccionarConversacion()` clears `canalActivo` — only one active view at a time
- `ExpandableText.vue` uses `-webkit-line-clamp: 3` for collapsed state, `max-height: 300px; overflow-y: auto` for expanded; "Expandir/Contraer" button visibility is toggled via CSS (`text-overflow: ellipsis` hides button when not needed)
- `characterSessionStore` is a module-level `ref` (in-memory) — sessions are lost on page reload; `CanalesList.vue` checks `haySesionActiva()` on mount and redirects to `/dashboard` if none

### Relevant Files

#### Backend (Java/Spring Boot) — `E:\playrole-backend\playrole-api\`
- `src\main\java\com\playrole\chat\controller\CharacterSessionController.java`: Session endpoints (`/iniciar`, `/cerrar`, `/cerrar-beacon`, `/cerrar-todas`, `/activas`)
- `src\main\java\com\playrole\chat\controller\CanalController.java`: Channel CRUD, membership, image upload/delete endpoints
- `src\main\java\com\playrole\chat\controller\CanalMensajeController.java`: Channel messages (REST)
- `src\main\java\com\playrole\chat\model\Canal.java`: Channel entity with `imagenUrl` field (column `imagen_url`, nullable)
- `src\main\java\com\playrole\chat\dto\CanalDTO.java`: Channel DTO with `imagenUrl` mapped from entity
- `src\main\java\com\playrole\chat\dto\CrearCanalDTO.java`: Channel creation DTO with nombre, descripcion, privado
- `src\main\java\com\playrole\chat\dto\EditarCanalDTO.java`: Channel edit DTO with same validations as CrearCanalDTO
- `src\main\java\com\playrole\chat\enums\PermisoCanal.java`: Includes EDITAR_CANAL (OWNER + ADMIN only)
- `src\main\java\com\playrole\chat\service\CanalService.java`: `listarMiembros()` uses `isOnline()` (not `isOnlineStrict`) for multi-char support; `actualizarImagen()` validates type/dimensions, stores in `uploads/canales/`
- `src\main\java\com\playrole\chat\service\PresenceService.java`: `characterStatus` map, `isOnline()` checks same-user characters AND requires an active DB session (`tieneSesionActivaValida`), re-broadcasts on disconnect using `isOnline()` for consistency
- `src\main\java\com\playrole\chat\service\SesionPersonajeService.java`: Session management, JWT generation, `sesionesActivas()` cleans expired JWTs, `cerrarSesion()` graceful failure, `tieneSesionActivaValida()` used by presence
- `src\main\java\com\playrole\chat\repository\CanalRepository.java`: `findCanalesDePersonaje` (JOIN MiembroCanal, WHERE visible=true)
- `src\main\java\com\playrole\chat\auth\CharacterSessionFilter.java`: Validates session JWT, sets SecurityContext
- `src\main\java\com\playrole\chat\auth\SessionJwtUtils.java`: JWT decode/encode, `validarToken()` checks expiration
- `src\main\java\com\playrole\config\SecurityConfig.java`: URL permissions, `/cerrar-beacon` is permitAll
- `src\main\java\com\playrole\controller\UsuarioController.java`: Login endpoint (`/usuarios/login`), requires CAPTCHA
- `src\main\java\com\playrole\service\CaptchaService.java`: reCAPTCHA verification, has `skipVerification` flag
- `src\main\resources\application.properties`: `recaptcha.skip-verification=${RECAPTCHA_SKIP_VERIFICATION:false}`

#### Frontend (Vue 3 + Vite) — `E:\playlore-frontend\playlore-frontend\`
- `src\pages\Chat\ChatWindow.vue`: Main chat component — all session/channel/PM/presence logic. Error handling: `onMounted` wraps each async in own try/catch; `iniciarSesionPersonaje` doesn't call `cerrarTodas()` on error; `ejecutarDesconectar` is async with modal close before disconnect
- `src\pages\Chat\ChatEditor.vue`: Formatting toolbar + emoji/dice/mention pickers + Ayuda modal. Floating layers: pickers 1040, toolbar 1035, overlay 1030 (all BELOW ChatWindow's modal backdrop 1050); Ayuda backdrop 2000. Listens for `pl:modal-abierto` (dispatched by ChatWindow when any modal opens) to close open pickers
- `src\pages\Canales\CanalChat.vue`: Standalone channel route (`/canales/:id`)
- `src\pages\Canales\CanalesList.vue`: Channel list with avatars, image upload in create modal, `ExpandableText` for descriptions
- `src\store\characterSessionStore.ts`: Session management store. Added `limpiarExpiradas()` for client-side JWT expiry check; `cerrarTodas()` uses individual `cerrarSesion()` calls (not API bulk endpoint)
- `src\store\userStore.ts`: User store, `cargarDesdeToken()` reads JWT from localStorage
- `src\services\websocket.ts`: STOMP/SockJS WebSocket service
- `src\services\chatApi.ts`: Chat REST API (channels, messages, presence, channel images) using character session JWT
- `src\services\api.ts`: Axios instance with interceptors (has duplicate interceptors at lines 10-20 and 23-37 — potential cleanup needed)
- `src\pages\Chat\chatUtils.ts`: Utility functions including `canalAvatar()` (accepts object or string, returns uploaded image URL or `ui-avatars.com` initials)
- `src\components\ExpandableText.vue`: Collapsible text component with expand/collapse button
- `src\router\index.ts`: Route guard checks `localStorage.getItem('token')` for auth
- `vite.config.ts`: Proxy `/api` → `http://localhost:8080` (NO `ws: true` — SockJS handles transport)

#### Database
- `MiembroCanal` table: Links characters to channels — must have records for channels to appear
- `SesionPersonaje` table: Active sessions — expired tokens now auto-cleaned by backend
