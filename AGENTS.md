# Frontend PlayLore (Vue 3 + Vite + TypeScript)

Frontend de PlayLore/PlayRole. Vite + Vue 3 + TypeScript + Bootstrap 5. Repositorio: `E:\playlore-frontend\playlore-frontend`.

## Comandos de verificación (SIEMPRE al terminar una tarea)

- Build: `npm run build` (debe pasar sin errores)
- Type-check: `npm run typecheck` (`vue-tsc --noEmit`; debe dar 0 errores — el build por sí solo NO valida tipos)
- Lint: `npm run lint` (ESLint, `--max-warnings 0`; debe quedar en 0)
- Tests: `npm run test` (Vitest + Vue Test Utils, entorno jsdom; los tests viven junto al módulo como `*.test.ts`)
- Dev: `npm run dev` (espera el backend en `http://localhost:8080`; base API en `VITE_API_URL`)
- CI: `.github/workflows/ci.yml` ejecuta `npm ci` + typecheck + lint + test + build en cada push/PR a `main` (runner Linux, Node 22).

## Convenciones de seguridad / UI

- PROHIBIDOS `alert()`/`confirm()`/`prompt()` nativos. Usar siempre:
  - `ModalAviso.vue` (avisos), `ModalConfirmacion.vue` (confirmaciones, soporta `peligro`),
  - `ModalInput.vue` (entrada de texto simple, sustituye a `prompt()`).
- Todo HTML de usuario renderizado con `v-html` debe llevar el directivo `v-sanitize` (nunca `v-html` solo).
- No inyectar atributos `href` con `javascript:`; los enlaces de perfil usan `profile:<id>` en el chat.
- Los botones decorativos/interactivos deben llevar `type="button"` (evita submits accidentales).
- Imágenes decorativas: `alt=""`; imágenes con significado: `alt` descriptivo. Añadir `aria-label` a controles de carrusel.
- No añadir dependencias nuevas sin justificarlo en la tarea.

## Estructura destacada

- `src/pages/Admin/`: paneles de administración (Usuarios, Baneos, Denuncias, Categorías, Personajes)
- `src/pages/Chat/`: ChatWindow, ChatEditor, ChatMessage, emojiData, chatUtils
- `src/components/`: modales compartidos, NavBar, Footer, RichTextEditor (Tiptap), Paginador, etc.
- `src/services/`: `api.ts` (axios con interceptor JWT), `chatApi.ts`, `websocket.ts`
- `src/store/userStore.ts`: estado de sesión del usuario

## Reglas backend relacionadas

- Contrato de error JSON: `{"error": "mensaje"}`; en los `catch` leer `e?.response?.data?.error`.
- Ver `AGENTS.md` del backend en `E:\playrole-backend\playrole-api\`.
- Planificación por fases/lotes: ver `ROADMAP.md` de este repo y el del backend.
