## Goal
Add real-time connected members sidebar with status colors, role icons, context menu actions (profile, DM, promote, expel), and a private messaging system within the chat.

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

## Next Steps
1. Test: switch between characters, verify status persists, messages stay cached, context menu works
2. Test: PM flow — open conversation from context menu, send messages, verify real-time delivery
3. Test: admin actions — promote/expel with different roles

## Critical Context
- The chat uses UI-internal character tabs (button "+", not browser tabs) — only ONE character per browser tab has an active WebSocket connection at a time; other characters' sessions exist only in-memory and in the database
- `putIfAbsent` in `onConnect` ensures existing status is not overwritten on WS reconnect
- `guardarEstadoSesion` now saves: `canalActivo`, `canalesUnidos`, `channelLastSeen`, `status`, `mensajes`, `pagina`, `hayMasMensajes`, `usuarioScrolledUp`
- Context menu visibility for admin actions is computed from `miRolEnCanal` (OWNER/ADMIN/MOD) and target `m.rol`
- PM conversations are grouped from ALL messages returned by `listarConversaciones`; the sidebar shows the other character with the latest message preview
- `noLeidosPriv` is a `Map<number, number>` keyed by other character's `personajeId`; incremented on incoming WS message when not in that conversation
- `seleccionarCanal()` clears `conversacionActiva`; `seleccionarConversacion()` clears `canalActivo` — only one active view at a time

## Relevant Files
- `E:\playrole-backend\playrole-api\src\main\java\com\playrole\chat\service\PresenceService.java`: `characterStatus` map, `updateStatus()`, `getStatus()`, `onConnect` no longer overwrites status on reconnect, `onDisconnect` keeps status
- `E:\playrole-backend\playrole-api\src\main\java\com\playrole\chat\dto\PresenceDTO.java`: new `String status` field
- `E:\playrole-backend\playrole-api\src\main\java\com\playrole\chat\dto\MiembroCanalDTO.java`: new `String status` field
- `E:\playrole-backend\playrole-api\src\main\java\com\playrole\chat\service\CanalService.java`: `listarMiembros()` populates `dto.setStatus()`
- `E:\playrole-backend\playrole-api\src\main\java\com\playrole\chat\controller\PresenceController.java`: `PUT /personajes/{id}/status`
- `E:\playlore-frontend\playlore-frontend\src\services\chatApi.ts`: `actualizarStatus()`, PM API methods
- `E:\playlore-frontend\playlore-frontend\src\pages\Chat\ChatWindow.vue`: Status system, session cache with messages, context menu, PM sidebar + main area, role sorting/icons, empty state, `seleccionarCanal`/`seleccionarConversacion` mutual exclusion
- `E:\playlore-frontend\playlore-frontend\src\pages\Canales\CanalChat.vue`: Status colors, context menu, admin actions, role sorting/icons (keeps own PM modal)
