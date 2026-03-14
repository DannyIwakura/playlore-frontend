# Playlore Frontend

Este proyecto es una aplicación frontend construida con **Vue 3**, **TypeScript** y **Vite**.

## 🧰 Requisitos previos

Asegúrate de tener instalado en tu sistema:

- **Node.js** (>= 16)
- **npm** (v8+) o **pnpm** (opcional)

Puedes verificar tus versiones con:

```bash
node -v
npm -v
```

## 🚀 Instalar dependencias

Desde la carpeta del proyecto (`playlore-frontend`), ejecuta:

```bash
npm install
```

> Si usas `pnpm`, usa `pnpm install`.

## ▶️ Ejecutar en modo desarrollo

Para iniciar el servidor de desarrollo y poder visualizar la app en el navegador:

```bash
npm run dev
```

Luego abre la URL que se muestra en consola (por defecto `http://localhost:5173`).

## 📦 Generar build de producción

Para compilar los archivos listos para producción:

```bash
npm run build
```

Los activos compilados se generan en la carpeta `dist/`.

## 🔍 Previsualizar build de producción

Para levantar un servidor local que sirva la build de producción:

```bash
npm run preview
```

## 🧩 Estructura principal del proyecto

- `src/` – Código fuente de la app (componentes, páginas, estilos, etc.)
- `src/router/` – Rutas de Vue Router
- `src/services/api.js` – Cliente HTTP / API
- `public/` – Archivos estáticos que se copian tal cual al build

## 📌 Notas adicionales

- Para cambiar la configuración de Vite: `vite.config.ts`
- Para tipos de TypeScript o alias: `tsconfig.json`

---

¡Listo! Ahora ya sabes cómo instalar y desplegar el proyecto localmente. Si necesitas ayuda con algún comando o con la configuración del entorno, dime y te ayudo.