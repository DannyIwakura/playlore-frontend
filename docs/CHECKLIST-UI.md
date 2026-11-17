# Checklist de revisión de UI — PlayLore Frontend

Lista corta para pasar antes de dar por buena cualquier modificación de interfaz. No sustituye a
los tests ni al type-check; cubre lo que las herramientas no detectan solas.

Contexto del sistema: `docs/COMPONENTES-UI.md`. Deuda y auditoría: `docs/ACCESIBILIDAD.md`.

---

## 1. Antes de escribir

- [ ] ¿He consultado `modern-web-guidance` para CSS, movimiento, formularios o JS de cliente?
- [ ] ¿Existe ya un componente, token o utilidad que resuelve esto? (ver `COMPONENTES-UI.md`)
- [ ] ¿El patrón aparece en dos o más sitios? Si sí, va a `style.css` o a un componente.
- [ ] ¿Necesito una dependencia nueva? Justificarla; si se puede con la plataforma, no se añade.

## 2. Tokens y estilos

- [ ] Colores, radios, sombras y duraciones salen de `var(--pl-*)`, no en crudo.
- [ ] Texto sobre fondo claro usa la variante `-ink`; fondo con texto blanco usa `-strong`.
- [ ] Amarillo nunca lleva texto blanco.
- [ ] No hay `style="..."` estático nuevo: los valores fijos van a una clase.
      Solo se admite `:style` para valores calculados en tiempo de ejecución.
- [ ] No se reintroducen overrides muertos (`.alert*`, `.pagination`, `.card-header/body`,
      `.form-text`, `.btn-success`, `.btn-secondary`, `.spinner-grow`, `.pl-divider`).
- [ ] No se renombran bloques BEM existentes por gusto.

## 3. Movimiento

- [ ] Todo `transform`/`translate`/`scale`/`@keyframes` está dentro de
      `@media (prefers-reduced-motion: no-preference)`.
- [ ] Con `reduce` se conservan color, borde, sombra y opacidad; no hay desplazamiento.
- [ ] Esqueletos y spinners quedan quietos con `reduce`.
- [ ] Las transiciones usan `--pl-duration-*` y `--pl-ease-*`.
- [ ] La animación de entrada no mueve el layout (nada de `height`/`margin` animados).

## 4. Accesibilidad

- [ ] Contraste ≥ 4.5:1 en texto normal y ≥ 3:1 en texto grande e iconos con significado.
- [ ] Todo control tiene nombre accesible: `<label>`, `aria-label` o texto visible.
- [ ] Botones icon-only llevan `aria-label` y su icono `aria-hidden="true"`.
- [ ] Imágenes decorativas `alt=""`; con significado, `alt` descriptivo.
- [ ] Foco visible en enlaces, botones, inputs, menús y tarjetas con enlace estirado.
- [ ] El foco no se quita sin reemplazo.
- [ ] Objetivos táctiles ≥ 24x24 px.
- [ ] Texto legible ≥ 0.75rem (12px); nada de `0.72rem` ni menores salvo iconos.
- [ ] Formularios: `novalidate` + validación propia, `aria-invalid`, `aria-describedby` solo
      mientras hay error, foco al primer error y error que se borra al editar.
- [ ] Errores generales con `role="alert"`; estados de carga con `role="status"`.
- [ ] Se navega con teclado: `Tab`, `Shift+Tab`, `Esc` en modales, flechas en menús.

## 5. Responsive y layout

- [ ] Sin scroll horizontal a 375px ni a 1280px (incluidas tablas del panel).
- [ ] Las tablas del panel se apilan con `@container (width < 760px)` y muestran su etiqueta.
- [ ] Cabeceras del panel al 100% de ancho.
- [ ] Imágenes con `width`/`height` (evita CLS) y `loading="lazy"` si están bajo el pliegue.
- [ ] Nada depende de un ancho fijo en píxeles para textos largos.

## 6. Rendimiento

- [ ] Imágenes nuevas razonablemente optimizadas (no subir originales de varios MB).
- [ ] No se importa un módulo pesado de forma estática si puede ser diferido.
- [ ] CLS ≤ 0.1 en la ruta tocada (medir con fuentes cargadas).

## 7. Seguridad y reglas del proyecto

- [ ] Nada de `alert()`/`confirm()`/`prompt()` nativos: `ModalAviso`/`ModalConfirmacion`/
      `ModalInput`/`ModalFormulario`.
- [ ] HTML de usuario con `v-sanitize` (nunca `v-html` solo).
- [ ] Sin `href="javascript:"`.
- [ ] Botones no submit llevan `type="button"`.
- [ ] No se reescribe el interior de `vue-advanced-chat` ni se sustituyen los modales compartidos
      por `<dialog>`/Popover API.

## 8. Verificación final

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

- [ ] Los cuatro comandos en verde (el build debe terminar en `✓ built`, exit 0).
- [ ] Si se tocó UI, repasar la ruta en escritorio y en móvil en el navegador.
- [ ] Commit en español, sin tildes ni ñ, explicando la causa y la medición si aplica.
