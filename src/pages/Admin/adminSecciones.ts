/**
 * Secciones del panel de administración.
 *
 * La navegación del panel es navegación entre páginas de una misma vista, no un
 * tablist: cada sección cambia el contenido principal y el título, por lo que
 * se anuncia como `nav` con `aria-current` en vez de `role="tab"`.
 */
export type RolAdmin = 'ADMIN' | 'MOD' | string | null | undefined

export interface SeccionAdmin {
  id: string
  etiqueta: string
  descripcion: string
  icono: string
  roles: ReadonlyArray<'ADMIN' | 'MOD'>
}

export const SECCIONES_ADMIN: ReadonlyArray<SeccionAdmin> = [
  {
    id: 'denuncias',
    etiqueta: 'Denuncias',
    descripcion: 'Revisa, resuelve o ignora los reportes de la comunidad.',
    icono: 'bi-flag',
    roles: ['ADMIN', 'MOD'],
  },
  {
    id: 'personajes',
    etiqueta: 'Personajes',
    descripcion: 'Suspende, revisa o elimina personajes de cualquier cuenta.',
    icono: 'bi-person-badge',
    roles: ['ADMIN', 'MOD'],
  },
  {
    id: 'baneos',
    etiqueta: 'Baneos globales',
    descripcion: 'Consulta y aplica baneos a cuentas y personajes.',
    icono: 'bi-hammer',
    roles: ['ADMIN', 'MOD'],
  },
  {
    id: 'auditoria',
    etiqueta: 'Auditoría',
    descripcion: 'Historial de las acciones de moderación, con motivo y responsable.',
    icono: 'bi-journal-text',
    roles: ['ADMIN', 'MOD'],
  },
  {
    id: 'usuarios',
    etiqueta: 'Usuarios',
    descripcion: 'Edita los datos y el rol de las cuentas registradas.',
    icono: 'bi-people',
    roles: ['ADMIN'],
  },
  {
    id: 'categorias',
    etiqueta: 'Categorías',
    descripcion: 'Organiza las categorías que usan los perfiles de personaje.',
    icono: 'bi-tags',
    roles: ['ADMIN'],
  },
]

export function seccionesVisibles(rol: RolAdmin): SeccionAdmin[] {
  return SECCIONES_ADMIN.filter((seccion) => seccion.roles.includes(rol as 'ADMIN' | 'MOD'))
}

/** Id de sección a partir de un hash de la URL (`#denuncias`) si es válido. */
export function idDesdeHash(hash: string): string | null {
  const limpio = hash.trim().replace(/^#/, '').trim()
  return limpio || null
}

/**
 * Sección inicial: la del hash cuando el rol puede verla; si no, la primera
 * disponible. Devuelve cadena vacía cuando el rol no tiene ninguna sección.
 */
export function seccionInicial(rol: RolAdmin, hash = ''): string {
  const visibles = seccionesVisibles(rol)
  const pedida = idDesdeHash(hash)
  if (pedida && visibles.some((seccion) => seccion.id === pedida)) return pedida
  return visibles[0]?.id ?? ''
}
