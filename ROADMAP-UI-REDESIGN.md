# Plan de rediseño visual de PlayLore

> Objetivo: modernizar toda la interfaz de PlayLore con Bootstrap 5 y una dirección visual inspirada en SmoothUI, manteniendo la funcionalidad, la seguridad y el comportamiento actual de la aplicación Vue 3.

## 1. Alcance y decisiones iniciales

### Tecnología actual

- Vue 3 + TypeScript + Vite.
- Bootstrap 5.3.8 y Bootstrap Icons ya instalados.
- `lucide-vue-next` ya disponible para iconos adicionales.
- Estilos globales concentrados principalmente en `src/style.css`, con estilos adicionales en cada componente.
- Rutas públicas: inicio, login y registro.
- Rutas protegidas: dashboard, usuarios, personajes, amigos, chat y perfiles.
- Rutas administrativas: usuarios, personajes, categorías, denuncias, baneos y auditoría.

### SmoothUI

SmoothUI es una biblioteca orientada a React, Tailwind y shadcn/ui. No se integrará como dependencia directa porque el proyecto está en Vue y Bootstrap.

Se utilizará como referencia de diseño y movimiento para:

- Superficies con capas, sombras suaves y bordes redondeados.
- Interacciones con transiciones cortas y predecibles.
- Microinteracciones en tarjetas, botones, menús y estados activos.
- Composiciones visuales más dinámicas y menos planas.
- Estados `calm` y `energetic`, combinando claridad funcional con personalidad.
- Diseños `crisp`, `soft` y `round`.
- Animaciones respetando `prefers-reduced-motion`.

La intención es adaptar estos principios con Bootstrap y CSS nativo de Vue, sin añadir una dependencia nueva sin necesidad.

### Principios del rediseño

- Diseño mobile-first, con experiencias completas en móvil, tablet y escritorio.
- Mantener Bootstrap como sistema base de rejilla, utilidades, formularios, navegación y componentes.
- Crear un sistema de diseño propio antes de rediseñar páginas.
- Priorizar claridad, contraste, legibilidad y accesibilidad.
- Conservar todos los flujos existentes: autenticación, usuarios, personajes, amistades, chat, moderación y administración.
- No introducir `alert()`, `confirm()` ni `prompt()` nativos.
- Mantener `v-sanitize` para HTML de usuario.
- Mantener la gestión de foco, `Esc`, `role="dialog"` y restauración de foco en los modales compartidos.
- Evitar animaciones que afecten rendimiento o accesibilidad.

---

## 2. Fases de trabajo

| Fase | Área | Resultado esperado |
|---|---|---|
| 0 | Diagnóstico y línea base | Inventario visual, capturas, accesibilidad y criterios de aceptación |
| 1 | Sistema de diseño | Tokens, tipografía, colores, espaciados, componentes base y variantes |
| 2 | Estructura global | Shell, navegación responsive, footer, estados de carga/error/vacío |
| 3 | Web pública | Home, hero, secciones informativas, CTAs y footer rediseñados |
| 4 | Autenticación y registro | Login y registro modernos, responsivos y con buenos estados de formulario |
| 5 | Dashboard y usuarios | Panel principal, perfil, edición, amistades y tarjetas de actividad |
| 6 | Personajes | Listados, buscador, creación, edición, categorías y perfiles |
| 7 | Chat | Chat responsive, mensajes, canales, presencia, editor y modales |
| 8 | Administración | Panel admin, tablas, filtros, acciones y estados de moderación |
| 9 | Movimiento e interacciones | Transiciones, microinteracciones, estados activos y reducción de movimiento |
| 10 | Calidad visual y accesibilidad | Auditoría, pruebas responsive, contraste, teclado y rendimiento |
| 11 | Limpieza y documentación | Eliminación de estilos obsoletos, documentación y checklist final |

---

## 3. Fase 0 — Diagnóstico y línea base

### Objetivo

Conocer el estado actual antes de modificar la interfaz y evitar cambios visuales que rompan flujos existentes.

### Tareas

- [x] Inventario de todas las rutas y pantallas.
- [x] Capturas de cada vista importante en escritorio y móvil.
- [x] Identificación de estilos globales, scoped y duplicados.
- [x] Revisión de formularios, tablas, modales, menús y estados vacíos.
- [x] Revisión de contraste y foco visible.
- [x] Revisión de rendimiento de imágenes y animaciones.
- [x] Confirmación de flujos que deben conservarse exactamente.
- [x] Creación de una rama exclusiva para el rediseño.

> Cierre retrospectivo: el trabajo se hizo directamente sobre `main`, sin rama exclusiva, y no se
> conservaron en el repo la matriz de pantallas ni las capturas iniciales. Las fases 1-3 se
> ejecutaron en `8cd8313`, `542e95d`, `17862f1` y `7d3460b`.

### Entregables

- Matriz de pantallas.
- Lista de problemas visuales y funcionales.
- Lista de deuda de accesibilidad.
- Criterios de aceptación del rediseño.

### Criterios de aceptación

- Todas las rutas principales están documentadas.
- Existe una referencia visual inicial para comparar antes/después.
- No se modifica todavía la funcionalidad.

---

## 4. Fase 1 — Sistema de diseño

### Objetivo

Crear una base visual común para que toda la aplicación se sienta uniforme.

### Tareas

- [x] Definir tokens de color: primario, secundario, acento, fondo, superficie, texto, éxito, advertencia, peligro e información.
- [x] Definir una paleta clara y oscura opcional, sin forzar el modo oscuro en esta primera entrega.
- [x] Definir tipografías y escalas para títulos, subtítulos, texto, pequeño y estados.
- [x] Definir espaciados, tamaños de fuente, alturas mínimas y anchos máximos.
- [x] Definir radios de borde por componente.
- [x] Definir sombras, capas y efectos sutiles inspirados en SmoothUI.
- [x] Definir estilos para botones primarios, secundarios, delicados, peligrosos y de navegación.
- [x] Definir tarjetas, listas, tablas, badges, alertas, inputs, selects, textareas y checkboxes.
- [x] Definir estados `default`, `hover`, `active`, `focus`, `disabled`, `loading`, `success`, `error` y `empty`.
- [x] Sobrescribir de forma controlada las variables y clases base de Bootstrap.
- [x] Crear una capa CSS de sistema de diseño antes de rediseñar páginas.

### Entregables

- Tokens visuales reutilizables.
- Componentes base consistentes.
- Guía mínima de uso del sistema.
- Ejemplos de componentes en móvil y escritorio.

### Criterios de aceptación

- Los colores y tipografías se usan de forma consistente.
- Los componentes base no dependen de estilos aislados de una sola página.
- Los contrastes cumplen al menos nivel AA en estados principales.
- Los radios, sombras y espaciados siguen una escala común.

---

## 5. Fase 2 — Estructura global de la aplicación

### Objetivo

Modernizar el entorno común de todas las vistas sin tocar todavía el contenido de cada flujo.

### Tareas

- [x] Revisar `App.vue` y decidir si conviene crear un shell compartido.
- [x] Rediseñar `NavBar.vue` con navegación responsive.
- [x] Mejorar el menú móvil con cierre automático, foco accesible y jerarquía clara.
- [x] Modernizar logo, enlaces, avatar, badges y acciones de usuario.
- [x] Unificar espaciados entre cabecera, contenido y footer.
- [x] Crear encabezados de página reutilizables para secciones protegidas.
- [x] Crear estados globales de carga, error y contenido vacío.
- [x] Unificar el diseño de `Footer.vue`.
- [x] Mantener las rutas y permisos actuales del router.

### Entregables

- Navegación responsive moderna.
- Shell global coherente.
- Estados compartidos para cargas y errores.
- Footer consistente en todas las páginas.

### Criterios de aceptación

- La navegación funciona correctamente en móvil y escritorio.
- Los botones tienen `type="button"` cuando no envían formularios.
- Los menús son utilizables por teclado.
- No se pierden accesos a dashboard, personajes, chat, amigos ni administración.

---

## 6. Fase 3 — Web pública

### Objetivo

Convertir la página de inicio en una presentación más atractiva y orientada a la conversión.

### Tareas

- [x] Rediseñar el hero principal con composición responsive.
- [x] Sustituir el carrusel de altura fija por una experiencia más flexible y accesible.
- [x] Mejorar titulares, copy, jerarquía visual y llamadas a la acción.
- [x] Crear secciones de valor: comunidad, personajes, chat y creatividad.
- [x] Añadir tarjetas o bloques visuales inspirados en SmoothUI.
- [x] Incorporar movimiento sutil en elementos estáticos.
- [x] Optimizar la carga y el recorte de imágenes.
- [x] Rediseñar el bloque de registro y CTA final.
- [x] Corregir textos y errores visibles del contenido actual.

### Entregables

- Home moderna y responsive.
- Hero con buen rendimiento.
- Secciones informativas y CTAs claros.
- Footer rediseñado.

### Criterios de aceptación

- El mensaje principal se entiende en menos de cinco segundos.
- El CTA principal es visible en móvil sin desplazamientos innecesarios.
- Las imágenes se recortan correctamente en todas las proporciones.
- El contenido permanece legible sobre fondos y colores de fondo.

---

## 7. Fase 4 — Autenticación y registro

### Objetivo

Mejorar la primera impresión y reducir la fricción en el acceso y la creación de cuentas.

### Tareas

- [x] Rediseñar `Login.vue`.
- [x] Rediseñar `Registro.vue`.
- [x] Usar tarjetas o paneles con jerarquía clara.
- [x] Mejorar etiquetas, errores, mensajes de ayuda y estados de validación.
- [x] Añadir estados de carga y error sin bloquear la interfaz.
- [x] Mejorar la experiencia del formulario en móvil.
- [x] Mantener OAuth y reCAPTCHA si forman parte del flujo actual.
- [x] Evitar mensajes genéricos cuando el backend devuelva un error concreto.

### Entregables

- Login moderno y responsive.
- Registro moderno y responsive.
- Estados de validación, carga y error.
- Experiencia coherente con el resto de la aplicación.

### Criterios de aceptación

- Los formularios son accesibles y fáciles de completar.
- Los errores se muestran junto al campo correspondiente.
- Los botones no parecen deshabilitados o confusos durante la carga.
- No se pierde ninguna opción de autenticación existente.

---

## 8. Fase 5 — Dashboard y usuarios

### Objetivo

Dar al panel principal y a la gestión de usuario una apariencia más organizada y funcional.

### Tareas

- [x] Rediseñar `Dashboard.vue`.
- [x] Crear una cabecera de dashboard con resumen visual.
- [x] Mejorar tarjetas de accesos rápidos.
- [x] Mejorar la sección de amigos recientes.
- [x] Añadir estados de carga, vacío y error.
- [x] Rediseñar `PerfilUsuario.vue`.
- [x] Rediseñar `EditarFormulario.vue`.
- [x] Rediseñar `AmigosList.vue`.
- [x] Unificar botones, badges y acciones de usuario.
- [x] Mejorar la zona de peligro sin perder claridad ni seguridad.

### Entregables

- Dashboard visualmente más completo.
- Perfil y edición de usuario coherentes.
- Lista de amigos más legible.
- Estados consistentes en toda el área de usuario.

### Criterios de aceptación

- Las acciones más frecuentes están visibles y ordenadas.
- Los datos largos no rompen el diseño móvil.
- Las acciones peligrosas requieren confirmación.
- Se mantiene el comportamiento de actualización de amigos y conexión.

---

## 9. Fase 6 — Personajes

### Objetivo

Rediseñar todo el flujo de creación, búsqueda y gestión de personajes.

### Tareas

- [x] Rediseñar `PersonajesList.vue`.
- [x] Rediseñar `BuscarPersonajes.vue`.
- [x] Rediseñar `NuevoPersonajeForm.vue`.
- [x] Rediseñar `EditarPersonajeForm.vue`.
- [x] Rediseñar `PerfilPersonajeView.vue`.
- [x] Rediseñar `AnadirCategoriaForm.vue`.
- [x] Crear filtros y controles de búsqueda más claros.
- [x] Añadir estados de carga, vacío y error.
- [x] Mejorar la presentación de galerías, atributos y categorías.
- [x] Adaptar formularios largos a una experiencia móvil usable.

### Entregables

- Listado de personajes moderno.
- Buscador y filtros responsivos.
- Formularios de creación y edición limpios.
- Perfil de personaje con mejor jerarquía visual.

### Criterios de aceptación

- Un usuario puede crear, buscar, editar y consultar personajes sin fricción.
- Los formularios largos se organizan por secciones.
- Las imágenes y galerías se muestran correctamente en móvil.
- Las categorías se gestionan sin perder contexto.

---

## 10. Fase 7 — Chat

### Objetivo

Modernizar la experiencia de mensajería sin alterar el protocolo WebSocket ni las reglas de moderación.

### Tareas

- [x] Revisar `ChatWindow.vue` y su distribución responsive.
- [x] Crear una vista de canales más clara.
- [x] Mejorar la lista de miembros y presencia.
- [x] Rediseñar `ChatMessage.vue`.
- [x] Rediseñar `ChatEditor.vue`.
- [x] Mejorar el editor RichText con iconos nombrados y estados claros.
- [x] Rediseñar los modales inline del chat o migrarlos progresivamente a componentes compartidos.
- [x] Añadir estados de conexión, reconexión, carga y error.
- [x] Mejorar la experiencia móvil del chat, especialmente el editor y los controles.
- [x] Mantener búsqueda de mensajes, denuncias, silencios y baneos.

### Entregables

- Chat visualmente moderno y responsive.
- Menos saturación visual en escritorio y móvil.
- Mejor claridad de presencia y estados de conexión.
- Modales más accesibles y coherentes.

### Criterios de aceptación

- Los mensajes se leen y responden fácilmente en móvil.
- Las acciones de moderación no son ambiguas.
- La reconexión y los errores no destruyen el contexto.
- Los modales mantienen foco, `Esc` y restauración cuando corresponda.

---

## 11. Fase 8 — Administración y moderación

### Objetivo

Crear un panel administrativo más rápido de usar, especialmente en listas grandes y acciones sensibles.

### Tareas

- [x] Rediseñar `AdminPanel.vue`.
- [x] Crear navegación lateral o pestañas claras para secciones administrativas.
- [x] Rediseñar `UsuariosLista.vue`.
- [x] Rediseñar `PersonajesLista.vue`.
- [x] Rediseñar `DenunciasLista.vue`.
- [x] Rediseñar `BaneosLista.vue`.
- [x] Rediseñar `AuditoriaLista.vue`.
- [x] Rediseñar `CategoriasLista.vue` y `CategoriaNueva.vue`.
- [x] Añadir filtros, búsqueda y acciones visibles.
- [x] Diferenciar claramente roles, estados y acciones destructivas.
- [x] Mejorar la experiencia en pantallas pequeñas.

### Entregables

- Panel administrativo organizado.
- Tablas y listas responsive.
- Acciones de moderación claras.
- Mejor jerarquía visual para auditoría y denuncias.

### Criterios de aceptación

- Un moderador puede localizar y actuar sobre un registro rápidamente.
- Las acciones destructivas son evidentes y requieren confirmación.
- Las tablas no obligan a desplazamiento horizontal innecesario en móvil.
- Se conserva el control de permisos ADMIN y MOD.

---

## 12. Fase 9 — Movimiento e interacciones

### Objetivo

Añadir personalidad y fluidez sin convertir la aplicación en una interfaz lenta o distractora.

### Tareas

- [x] Definir duraciones y curvas de transición.
- [x] Añadir transiciones suaves en hover, foco, despliegue y cambio de estado.
- [x] Añadir microinteracciones en botones, tarjetas, pestañas y menús.
- [x] Añadir animaciones de entrada limitadas a elementos clave.
- [x] Implementar skeletons o loading states donde corresponda.
- [x] Respetar `prefers-reduced-motion`.
- [x] Evitar animaciones continuas en fondos, avatares y chats.
- [x] Verificar que las animaciones no generan scroll ni cambios de layout bruscos.

### Entregables

- Sistema de movimiento consistente.
- Interacciones agradables en todos los componentes.
- Comportamiento accesible en modo de reducción de movimiento.

### Criterios de aceptación

- Las animaciones son cortas y útiles.
- No hay movimiento perpetuo.
- La interfaz sigue siendo cómoda para usuarios sensibles al movimiento.
- El rendimiento no se degrada en dispositivos móviles.

> Implementación: duraciones y curvas en tokens `--pl-duration-fast/base/slow` y `--pl-ease-standard/out`,
> usados por todas las transiciones de `src/style.css` y de los componentes. El desplazamiento espacial
> (elevación de tarjetas, zoom de imágenes, giro del caret, pulsación con `scale`) solo se activa dentro
> de `@media (prefers-reduced-motion: no-preference)`; con `reduce` se conservan color, borde, sombra y
> opacidad. Los esqueletos y los spinners de Bootstrap se detienen con `reduce`. La entrada se limita a
> `.pl-animate-in` y al hero de la portada (`pl-fade-up`, 300 ms, una sola vez, sin mover el layout).
> Se retiró el `animation-duration: 0.01ms` global que desaconseja la guía de movimiento.

---

## 13. Fase 10 — Calidad visual, accesibilidad y rendimiento

### Objetivo

Validar que el rediseño es atractivo, usable, accesible y estable antes de considerarlo terminado.

### Tareas

- [ ] Revisar todas las rutas en escritorio y móvil.
- [ ] Verificar tamaños mínimos de texto y contraste.
- [ ] Verificar foco visible en enlaces, botones, inputs y menús.
- [ ] Verificar navegación por teclado.
- [ ] Verificar etiquetas `aria-label` en botones icon-only.
- [ ] Revisar modales, dropdowns, paginadores y galerías.
- [ ] Comprobar que los formularios anuncian errores de forma accesible.
- [ ] Revisar imágenes con `alt` descriptivo o `alt=""` decorativo.
- [ ] Optimizar imágenes pesadas y tamaños de carga.
- [ ] Comprobar tiempos de interacción y consumo de recursos.
- [ ] Probar con varios tamaños de pantalla.
- [ ] Documentar hallazgos y correcciones.

### Entregables

- Auditoría visual final.
- Lista de incidencias accesibilidad/responsive.
- Correcciones aplicadas.
- Resultado de build, typecheck, lint y tests.

### Criterios de aceptación

- Build, typecheck, lint y tests pasan sin errores.
- No hay errores visibles importantes en las rutas principales.
- Los componentes principales funcionan con teclado.
- El contraste cumple los objetivos definidos.
- El diseño no depende de orientación, tamaño o puntero específico.

---

## 14. Fase 11 — Limpieza, mantenimiento y documentación

### Objetivo

Dejar el rediseño mantenible y evitar que los estilos vuelvan a dispersarse.

### Tareas

- [ ] Eliminar estilos obsoletos de páginas ya rediseñadas.
- [ ] Consolidar clases repetidas en componentes compartidos.
- [ ] Evitar `style` inline cuando exista una clase del sistema.
- [ ] Revisar nombres de clases y consistencia de convenciones.
- [ ] Documentar componentes visuales reutilizables.
- [ ] Actualizar `docs/ACCESIBILIDAD.md` con los avances.
- [ ] Actualizar la documentación de desarrollo si cambia la estructura.
- [ ] Preparar una checklist de revisión para futuras modificaciones.

### Entregables

- Código visualmente limpio.
- Componentes reutilizables documentados.
- Deuda de accesibilidad actualizada.
- Checklist de mantenimiento.

### Criterios de aceptación

- No quedan estilos duplicados sin necesidad.
- Una nueva pantalla puede seguir el sistema sin copiar bloques de otra página.
- La documentación refleja el estado real del proyecto.

---

## 15. Orden recomendado de implementación

1. Fase 0: diagnóstico y línea base.
2. Fase 1: sistema de diseño.
3. Fase 2: estructura global.
4. Fase 3: web pública.
5. Fase 4: autenticación.
6. Fase 5: dashboard y usuarios.
7. Fase 6: personajes.
8. Fase 7: chat.
9. Fase 8: administración.
10. Fase 9: movimiento e interacciones.
11. Fase 10: calidad y accesibilidad.
12. Fase 11: limpieza y documentación.

No conviene rediseñar todas las páginas antes de definir el sistema de diseño, porque cada cambio visual terminaría usando valores distintos y sería difícil de mantener.

---

## 16. Criterios generales de aceptación del proyecto

El rediseño se considerará completado cuando:

- [ ] La aplicación tenga una identidad visual coherente en todas las rutas.
- [ ] La experiencia móvil sea completa y usable.
- [ ] Bootstrap siga siendo la base del layout y los componentes.
- [ ] Los patrones visuales y de movimiento estén inspirados en SmoothUI sin añadir una dependencia incompatible.
- [ ] Los flujos de autenticación, personajes, amistades, chat y administración funcionen como antes.
- [ ] Los formularios tengan errores claros y accesibles.
- [ ] Los botones decorativos e interactivos tengan `type="button"`.
- [ ] El HTML de usuario siga usando `v-sanitize`.
- [ ] Los modales compartidos mantengan foco, `Esc` y restauración.
- [ ] Los botones icon-only tengan nombre accesible.
- [ ] Las animaciones respeten `prefers-reduced-motion`.
- [ ] `npm run build`, `npm run typecheck`, `npm run lint` y `npm run test` pasen correctamente.

---

## 17. Comandos de verificación

```bash
npm run dev
npm run typecheck
npm run lint
npm run test
npm run build
```

### Verificación visual recomendada

- `http://localhost:5173/`
- `http://localhost:5173/login`
- `http://localhost:5173/registro`
- `http://localhost:5173/dashboard`
- `http://localhost:5173/personajes`
- `http://localhost:5173/personajes/buscar`
- `http://localhost:5173/chat`
- `http://localhost:5173/admin`

Tamaño mínimo recomendado para revisión:

- Móvil: 390 × 844 px.
- Móvil pequeño: 320 × 568 px.
- Tablet: 768 × 1024 px.
- Escritorio: 1440 × 900 px.

---

## 18. Riesgos y precauciones

- SmoothUI está pensado para React/Tailwind; sus componentes no deben copiarse directamente en Vue/Bootstrap.
- Rediseñar `ChatWindow.vue` puede afectar interacciones críticas; conviene hacerlo por partes.
- Los estilos `scoped` pueden ocultar dependencias entre componentes; antes de eliminar clases conviene probar el flujo completo.
- Las tablas administrativas pueden rompers en móvil si no se definen desde el principio soluciones responsive.
- Las animaciones excesivas pueden afectar rendimiento y accesibilidad.
- Los cambios visuales no deben modificar respuestas de API, permisos ni reglas de validación.
- Cualquier estado de error debe conservar el mensaje concreto devuelto por el backend cuando exista.

---

## 19. Resultado final esperado

Una aplicación PlayLore con:

- Identidad visual moderna y reconocible.
- Bootstrap como base estable y familiar.
- Interfaz responsive para móvil, tablet y escritorio.
- Componentes coherentes y reutilizables.
- Microinteracciones sutiles y accesibles.
- Mejor jerarquía visual en landing, dashboard, personajes, chat y administración.
- Formularios, menús, modales y tablas más claros.
- Una base preparada para evoluciones futuras sin acumular estilos aislados.

---

## 20. Política de uso de `modern-web-guidance`

Skill de Google Chrome (junto con Mozilla, Edge y MDN) instalado globalmente en
`~/.agents/skills/modern-web-guidance` como copia manual de
`https://github.com/GoogleChrome/modern-web-guidance`. Para actualizarlo hay que volver a copiar
`skills/modern-web-guidance/` del repo (el `update` del CLI no aplica a una copia manual).

Consulta, antes de implementar UI, CSS o JS de cliente:

```bash
DISABLE_TELEMETRY=1 npx -y modern-web-guidance@latest search "<tema>"
DISABLE_TELEMETRY=1 npx -y modern-web-guidance@latest retrieve "<id>"
```

### Alcance

- **Se aplica a**: CSS, sistema de diseño, movimiento, formularios, accesibilidad y rendimiento.
- **No se aplica a**: sustituir `ModalAviso`/`ModalConfirmacion`/`ModalInput` por `<dialog>` o Popover API
  (si algún día se migra, se hace en los tres componentes a la vez y con sus tests), ni a reescribir el
  interior de `vue-advanced-chat` (las guías aplican a nuestro contenedor y composables, no al componente de terceros).
- **Sanitización**: se mantiene DOMPurify + `v-sanitize`. No adoptar `setHTML()`/Sanitizer API mientras no sea
  Baseline amplio, porque saltaría la política actual.
- **Baseline**: adoptar mejoras progresivas; si una feature no es Baseline, aplicar el fallback de la guía.
  `tsconfig` fija `lib` en ES2020 (heredado de `@vue/tsconfig`), así que **no** usar `toSorted()`, `findLast()`
  ni el resto de ES2023 sin actualizar antes la política de navegadores (`lib` + `build.target` de Vite + nota aquí).
  Ojo: `lib` solo declara tipos, no añade polyfills; un cambio de `lib` sin `build.target` esconde el riesgo.

### Reglas de color derivadas de la auditoría de contraste

- `--pl-*` es el color de marca/relleno; **no** se usa como color de texto sobre su propio tinte.
- Texto sobre fondo tintado (badges, etiquetas, pills): usar los tokens `--pl-*-ink`.
- Relleno sólido con texto blanco: usar los tokens `--pl-*-strong`.
- El amarillo (`--pl-warning`) nunca lleva texto blanco: se usa `--pl-ink` sobre el relleno.

---

## 21. Registro de pendientes conocidos

### Cerrados

| Pendiente | Commit | Cómo se cerró |
|---|---|---|
| `RichTextEditor.vue` con grises propios (`#ccc`, `#f8f9fa`, `#3b82f6`) | `0e755fb` | Tokens `--pl-*`; barra `role="toolbar"` con 4 `role="group"`, `aria-controls` y `aria-label`/`title` por botón; `aria-pressed` en toggles; área `role="textbox"` + `aria-multiline` + `aria-label` con el `id` y la etiqueta del formulario. |
| `Link` duplicado en tiptap | `0e755fb` | StarterKit v3 ya incluye `Link`; se elimina el import y desaparece el aviso "Duplicate extension names". |
| Etiqueta "Trasfondo" apuntando a un `id` inexistente | `0e755fb` | `span.form-label` + prop `etiqueta`; `aria-controls="trasfondo"` y el área editable llevan el mismo `id`. |
| `PaginadorComponent.vue` con clases Bootstrap y extremos sin nombre accesible | `0e755fb` | `nav[aria-label="Paginación"]`, `aria-current="page"`, `aria-disabled` en los extremos y guardas de rango para no emitir fuera de la lista. 7 tests. |
| `Footer.vue` con import de `defineProps` y fondo en hex | `0e755fb` | Import fuera, `var(--pl-dark)` y `prefers-reduced-motion` en los enlaces. |
| Uso de `toSorted()`/ES2023 en `src` | comprobado | Sin coincidencias de `toSorted`, `findLast`, `toReversed`, `toSpliced`, `with(` ni `groupBy`; `lib` sigue en ES2020. |
| Mensaje "No pudimos identificar tu cuenta" en Tus personajes | `d999b90` | `hidratarDesdeToken()`, guard que redirige a `/login` y filtro del 401 de sesión de personaje en `api.ts`. 218 tests y 4 escenarios Playwright. |
| Tablas admin con cabeceras incompletas y Denuncias con scroll horizontal | `42a5e8d` | Cabeceras al 100% en las 6 tablas; Denuncias 900/900 en escritorio y 364/364 en móvil. |
| Movimiento sin tokens ni respeto a `prefers-reduced-motion` | `1192abf` | Tokens `--pl-duration-*`/`--pl-ease-*` en todo el CSS; el desplazamiento espacial vive en `no-preference`; esqueletos y spinners se detienen con `reduce`; entrada limitada al hero. Playwright: CLS 0 y sin scroll horizontal en 1280 y 375. |

### Abiertos

- **Fases 10-11**: calidad visual/accesibilidad final y limpieza/documentación.
- **Chunk `RichTextEditor`**: ~379 kB (120 kB gzip). No se ha partido; valorar carga diferida del editor o extensiones bajo demanda en la Fase 11.
- **Cierre retrospectivo de las fases 0-3**: cerradas en este documento con los commits `8cd8313` (sistema de diseño), `542e95d` (navegación), `17862f1` (web pública y autenticación) y `7d3460b` (dashboard/personajes/administración). La Fase 0 se hizo sobre `main` y no conservó matriz de pantallas ni capturas.


