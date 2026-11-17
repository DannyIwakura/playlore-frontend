# Componentes y sistema de UI — PlayLore Frontend

Referencia viva del sistema visual: tokens, utilidades, componentes reutilizables y convenciones
para escribir CSS y plantillas. Se actualiza cuando cambia el sistema, no con cada pantalla.

- Dirección visual: **Slate Modern** (superficies claras, tinta azul-gris, primario violeta, acento cian).
- Fuente de verdad de estilos globales: `src/style.css`.
- Los estilos de cada componente viven en su bloque `<style scoped>`; solo se sube a `style.css`
  lo que comparten dos o más componentes.

---

## 1. Tokens

Todos los tokens son custom properties en `:root` de `src/style.css` y se consumen con `var(--pl-*)`.
No escribir colores, radios, sombras ni duraciones en crudo dentro de un componente si existe un token.

### Color

Cada familia tiene cuatro variantes con un papel fijo:

| Sufijo | Uso | Ejemplo |
|---|---|---|
| `--pl-<familia>` | Relleno, marca, iconos decorativos grandes | `--pl-primary` |
| `--pl-<familia>-rgb` | Tintes con `rgba(var(--pl-...-rgb), α)` | `rgba(var(--pl-primary-rgb), 0.12)` |
| `--pl-<familia>-ink` | **Texto sobre fondo claro** (cumple AA) | `color: var(--pl-primary-ink)` |
| `--pl-<familia>-strong` | **Relleno con texto blanco** (cumple AA) | `background: var(--pl-danger-strong)` |

Familias: `primary`, `cyan`, `success`, `warning`, `danger`, `info`, más `dark`.

> Regla: el color base no llega a 4.5:1 sobre blanco. Para texto se usa `-ink`; para fondo con
> texto blanco, `-strong`. El amarillo (`--pl-warning`) **nunca** lleva texto blanco.

### Superficie y texto

| Token | Papel |
|---|---|
| `--pl-bg` | Fondo de página |
| `--pl-bg-soft` | Fondo de página atenuado (chat) |
| `--pl-surface` | Tarjetas, modales, tablas |
| `--pl-surface-soft` | Filas alternas, estados hover suaves |
| `--pl-ink` | Texto principal |
| `--pl-muted` | Texto secundario (cumple AA sobre superficie) |
| `--pl-border` | Bordes y separadores |

### Forma y profundidad

`--pl-radius-sm` (0.5rem) · `-md` (0.75rem) · `-lg` (1rem) · `-xl` (1.5rem)
`--pl-shadow-sm` · `-md` · `-lg` · `--pl-glow` (halo violeta de marca).

### Movimiento

| Token | Valor | Uso |
|---|---|---|
| `--pl-duration-fast` | 140ms | Hover, color, foco |
| `--pl-duration-base` | 200ms | Aparición de paneles |
| `--pl-duration-slow` | 300ms | Entrada de página/hero |
| `--pl-ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Interacciones |
| `--pl-ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | Entradas |

Todo movimiento espacial (transform, translate, scale, keyframes) va dentro de
`@media (prefers-reduced-motion: no-preference)`. Con `reduce` se conservan color, borde, sombra y
opacidad, pero nada se desplaza. No existe un `animation-duration: 0.01ms` global: cada componente
declara su bloque `reduce` si mueve algo.

---

## 2. Utilidades globales

Clases de `style.css` para patrones que se repiten en varias vistas.

### Botones

| Clase | Resultado |
|---|---|
| `.pl-btn` | Base: altura mínima 44px, radio `-md`, transición y feedback de pulsación |
| `.pl-btn--primary` | Relleno violeta con blanco |
| `.pl-btn--secondary` | Superficie blanca con borde |
| `.pl-btn--ghost` | Sin fondo, texto primario |
| `.pl-btn--danger` | Relleno rojo con blanco |
| `.pl-btn--danger-ghost` | Texto rojo, fondo tenue |
| `.pl-btn--success` | Relleno verde con blanco |
| `.pl-btn--sm` | Variante compacta |

Los botones de Bootstrap (`.btn`, `.btn-primary`, `.btn-danger`, `.btn-outline-*`, `.btn-light`)
siguen existiendo porque hay pantallas que aún los usan; para UI nueva, preferir `.pl-btn`.

### Contenedores y estructura

`.pl-page` (contenedor de página) · `.pl-page-header` · `.pl-title` · `.pl-page-title` ·
`.pl-lead` · `.pl-page-description` · `.pl-section` · `.pl-section-soft` · `.pl-section-white`.

### Tarjetas y estados

`.pl-card` · `.pl-card-hover` · `.pl-feature-grid` · `.pl-feature-card` · `.pl-icon-tile`
(+ `--cyan/--success/--warning/--danger`) · `.pl-empty-state` (+ `--compact`) · `.pl-status-pill`
(+ `--warning/--danger/--info/--neutral`) · `.pl-alert` (+ `--success/--warning/--danger`).

### Formularios

| Clase | Uso |
|---|---|
| `.pl-field` | Contenedor de campo (margen inferior) |
| `.pl-field__hint` | Ayuda persistente bajo el campo |
| `.pl-field__error` | Error del campo; se muestra solo mientras hay error |
| `.pl-form-seccion` | Bloque de formulario con número y título |
| `.pl-form-acciones` | Barra de acciones al pie |
| `.pl-segmentado` + `__opcion` | Grupo de radios nativos ocultos con apariencia de segmentos |

Patrón de error: `novalidate` en el `<form>`, validación propia, `aria-invalid="true"` y
`aria-describedby` **solo mientras existe error**, foco al primer `[aria-invalid="true"]` con
`enfocarPrimerError`, y el error del campo se borra al editar. Un 400 `{campo: mensaje}` se reparte
por campo; el resto va a una alerta general `role="alert"`.

### Tablas de administración

`.pl-tabla-envoltura` (región con `tabindex="0"`) · `.pl-tabla-admin` · `.pl-tabla-admin__*`
(`barra`, `resumen`, `principal`, `secundario`, `fecha`, `avatar`, `acciones`, `clamp`, `pie`).

Por debajo de 760px de contenedor la tabla se apila: `@container (width < 760px)` oculta la
cabecera y cada `td` muestra su etiqueta con `::before` usando `data-etiqueta`.

### Avatar y texto

| Clase | Uso |
|---|---|
| `.pl-avatar` | `border-radius: 50%` + `object-fit: cover` (sustituye a `rounded-circle` + estilo inline) |
| `.pl-pre-wrap` | `white-space: pre-wrap` para mensajes con saltos de línea |
| `.pl-text-xs` | `font-size: 0.75rem` (mínimo legible; no bajar de aquí) |

Las imágenes que reservan espacio deben llevar `width`/`height` como atributos (evita CLS) y
`loading="lazy"` + `decoding="async"` si están por debajo del pliegue.

### Utilidades Bootstrap sobrescritas

`.text-primary/success/warning/danger/info` apuntan a sus variantes `-ink` (el color base no cumple
AA sobre blanco). `.badge` fija radio, tamaño y peso. No reintroducir overrides de `.alert*`,
`.pagination`, `.card-header/body`, `.form-text`, `.btn-success` ni `.btn-secondary`: se eliminaron
en la Fase 11 porque no se usaban.

---

## 3. Componentes reutilizables

### Modales (obligatorios en lugar de `alert`/`confirm`/`prompt`)

Los tres comparten `src/composables/useModalFocus.ts`: foco inicial dentro del diálogo, `Esc` para
cerrar, trap de `Tab`/`Shift+Tab`, `role="dialog"` + `aria-modal="true"` y restauración del foco al
cerrar. No sustituirlos por `<dialog>` ni por la Popover API sin migrar los tres a la vez y sus tests.

| Componente | Props | Emits |
|---|---|---|
| `ModalAviso` | `mensaje`, `titulo?` | `cerrar` |
| `ModalConfirmacion` | `mensaje`, `titulo?`, `botonConfirmar?`, `botonCancelar?`, `peligro?` | `confirmar`, `cancelar` |
| `ModalInput` | `titulo`, `etiqueta`, `mensaje?`, `valorInicial?`, `placeholder?`, `botonConfirmar?`, `botonCancelar?`, `type?` | `confirmar(valor)`, `cancelar` |
| `ModalFormulario` | `titulo`, `ancho?` (`sm`/`md`), slot por defecto | `cerrar` |

`ModalFormulario` es el contenedor para formularios a medida: cabecera con título y cierre, y el
cuerpo lo pone la vista.

### Listados y datos

| Componente | Props | Emits |
|---|---|---|
| `PaginadorComponent` | `paginaActual`, `totalPaginas` | `cambiar(pagina)` |
| `TarjetaPersonaje` | `personaje` (id, nombre, género, raza, clase, edad, avatar, trasfondo); slot `acciones` | — |
| `TablaAdmin` (`pages/Admin/components/`) | `titulo`, `columnas`, `total?`, `cargando?`, `error?`, `vacio?`, `resumen?`; slots `barra` y por defecto (filas) | — |
| `GaleriaImagenes` | `personajeId`, `esPropietario?` | `imagenSubida`, `imagenEliminada` |
| `OnlineStatusBadge` | `online`, `size?` (`sm`/`md`/`lg`) | — |

### Contenido y editor

| Componente | Props | Notas |
|---|---|---|
| `ExpandableText` | `text?`, `fallback?`, `maxLines?` | Recorta con `line-clamp` y ofrece "Ver más"; `:style` calculado es intencional |
| `RichTextEditor` | `modelValue`, `id?`, `etiqueta?` | Tiptap; barra `role="toolbar"` con grupos y `aria-pressed` |
| `ReCaptcha` | — | Carga el script de Google y expone el token |

### Navegación

| Componente | Props | Notas |
|---|---|---|
| `NavBar` | `logeado` | Dropdown y menú móvil; badge de no leídos |
| `Footer` | `logeado?` | Enlaces públicos o de usuario |

---

## 4. Convenciones de nombres

- **Utilidades y componentes del sistema**: prefijo `pl-` y, si es un bloque, BEM
  (`pl-tabla-admin__barra`, `pl-btn--primary`).
- **Estilos locales de una vista**: BEM con el nombre del bloque de la vista
  (`perfil-layout`, `chat-tabs-bar`, `personaje-card__media`). No se renombran bloques existentes solo
  por estilo: el coste de tocar plantillas y tests supera el beneficio.
- **Variantes dinámicas** (rol, tamaño, color) se construyen con plantilla de cadena:
  `` `chat-rol-badge--${rol.toLowerCase()}` ``. Un detector de clases sin uso las marcará como
  huérfanas; están justificadas y se conservan.
- **Clases de transición de Vue** (`fade-enter-active`, `fade-leave-to`...) también aparecen como
  "sin uso" en el detector: las genera Vue, no el template.
- **Estilos inline**: solo para valores calculados en tiempo de ejecución (`:style` con color, posición
  o altura dinámica). Un valor estático repetido se convierte en clase.

---

## 5. Cómo añadir UI nueva

1. Consultar `modern-web-guidance` antes de escribir CSS/JS de cliente (política en
   `ROADMAP-UI-REDESIGN.md` §20).
2. Reutilizar tokens y utilidades de este documento antes de crear algo nuevo.
3. Si el patrón aparece en dos sitios, subirlo a `style.css` o a un componente.
4. Pasar la checklist de `docs/CHECKLIST-UI.md`.
5. Verificar con `npm run typecheck`, `npm run lint`, `npm run test` y `npm run build`.
