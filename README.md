# PlayLore Frontend

Frontend de PlayLore/PlayRole. Vue 3 + TypeScript + Vite + Bootstrap 5.

---

## Requisitos previos

- **Node.js 22+** ([Descargar](https://nodejs.org/es/download))
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
  composables/      — useModalFocus
  style.css         — Estilos globales (modales compartidos)
```

---

## Notas técnicas

- Los `alert()`/`confirm()`/`prompt()` nativos están **prohibidos**; usar `ModalAviso.vue`, `ModalConfirmacion.vue`, `ModalInput.vue`.
- HTML de usuario se renderiza con `v-sanitize` (nunca `v-html` solo).
- Los tests viven junto al módulo como `*.test.ts`.

---

    PlayRole (c) 2026 by Daniel is licensed under CC BY-SA 4.0.
    To view a copy of this license, visit https://creativecommons.org/licenses/by-sa/4.0/
