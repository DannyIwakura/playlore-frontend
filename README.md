# PlayLore Frontend

Frontend de PlayLore/PlayRole. Vue 3 + TypeScript + Vite + Bootstrap 5.

---

## Requisitos previos

- **Node.js 22.22.2+** (o 24.15+ / 26+; exigido por jsdom 31 y Vitest 5) ([Descargar](https://nodejs.org/es/download))
- **npm** (incluido con Node)
- **Backend corriendo** en `http://localhost:8080` (ver repositorio del backend)

---

## Instalación

```bash
npm install
```

---

## Variables de entorno

El archivo `.env.development` contiene los valores por defecto para desarrollo local. Copia `.env.example` si necesitas personalizar algo.

| Variable | Descripción | Default (dev) |
|---|---|---|
| `VITE_API_URL` | URL base del backend (proxy inverso en dev) | `/api` |
| `VITE_ASSET_URL` | URL para assets estáticos (avatares, galerías) | `/api` |
| `VITE_RECAPTCHA_SITE_KEY` | Site key de reCAPTCHA | clave de prueba Google |
| `VITE_GOOGLE_CLIENT_ID` | Client ID de Google OAuth | client-id de dev |

---

## Desarrollo

```bash
npm run dev
```

Abre `http://localhost:5173` en el navegador. El frontend proxea las llamadas `/api` al backend en `http://localhost:8080`.

---

## Comandos de verificación

```bash
npm run typecheck   # TypeScript (vue-tsc --noEmit)
npm run lint        # ESLint (--max-warnings 0)
npm run test        # Vitest + Vue Test Utils
npm run build       # Build de producción
```

---

## Estructura del proyecto

```
src/
  pages/           — Vistas principales (Admin, Chat, Personajes, Login...)
    Admin/          — Panel de administración (Usuarios, Baneos, Auditoría...)
    Chat/           — ChatWindow, composables, chatUtils, chatApi
  components/       — Componentes reutilizables (modales, NavBar, Footer...)
  services/         — api.ts (axios), chatApi.ts, websocket.ts
  store/            — userStore.ts (estado de sesión)
  composables/      — useModalFocus, useFocoPrimerError, usePestanas
  style.css         — Tokens, utilidades y estilos globales compartidos
docs/
  COMPONENTES-UI.md — Sistema visual: tokens, utilidades y componentes reutilizables
  CHECKLIST-UI.md   — Checklist de revisión antes de cerrar un cambio de UI
  ACCESIBILIDAD.md  — Informe de accesibilidad y deuda pendiente
```

---

## Notas técnicas

- Los `alert()`/`confirm()`/`prompt()` nativos están **prohibidos**; usar `ModalAviso.vue`, `ModalConfirmacion.vue`, `ModalInput.vue`.
- HTML de usuario se renderiza con `v-sanitize` (nunca `v-html` solo).
- Los tests viven junto al módulo como `*.test.ts`.
- Sistema visual (tokens, utilidades y componentes): `docs/COMPONENTES-UI.md`. Antes de cerrar un cambio de UI, pasar `docs/CHECKLIST-UI.md`.
- No usar `style="..."` estático si existe una clase del sistema; `:style` solo para valores calculados en ejecución.

---

    PlayRole (c) 2026 by Daniel is licensed under CC BY-SA 4.0.
    To view a copy of this license, visit https://creativecommons.org/licenses/by-sa/4.0/
