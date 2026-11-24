export const AVATAR_DEFECTO = `${import.meta.env.VITE_API_URL}/images/AVATAR.png`

export const statusOptions = [
  { value: 'conectado', label: 'Conectado', icon: 'bi-circle-fill', color: '#22c55e' },
  { value: 'ausente', label: 'Ausente', icon: 'bi-clock-fill', color: '#eab308' },
  { value: 'ocupado', label: 'Ocupado', icon: 'bi-dash-circle-fill', color: '#ef4444' },
  { value: 'no molestar', label: 'No molestar', icon: 'bi-ban-fill', color: '#a855f7' },
]

export const roleOrder: Record<string, number> = { OWNER: 0, ADMIN: 1, MOD: 2, MEMBER: 3 }

const etiquetasRolesCanal: Record<string, string> = {
  OWNER: 'DUEÑO',
  ADMIN: 'ADMIN',
  MOD: 'MOD',
  MEMBER: 'MIEMBRO',
}

/** Etiqueta visible de un rol de canal; los valores internos no cambian. */
export function etiquetaRolCanal(rol: string | null | undefined): string {
  if (!rol) return 'MIEMBRO'
  return etiquetasRolesCanal[rol] ?? rol
}

export function avatarUrl(avatar: string | null | undefined): string {
  if (!avatar || avatar.includes('AVATAR.png')) return AVATAR_DEFECTO
  if (avatar.startsWith('http')) return avatar
  return `${import.meta.env.VITE_API_URL}${avatar}`
}

export function canalAvatar(canal: { nombre: string; imagenUrl?: string | null } | string): string {
  const imagenUrl = typeof canal === 'object' ? canal.imagenUrl : null
  const nombre = typeof canal === 'string' ? canal : canal.nombre
  if (imagenUrl) {
    if (imagenUrl.startsWith('http')) return imagenUrl
    return `${import.meta.env.VITE_API_URL}${imagenUrl}`
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=0d6efd&color=fff&bold=true&size=32`
}

export function formatFecha(fecha: string): string {
  const d = new Date(fecha)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const min = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  if (h < 24) return `hace ${h} h`
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

export function getStatusColor(status: string | undefined | null): string {
  const opt = statusOptions.find(s => s.value === status)
  return opt?.color ?? '#22c55e'
}

export function sortByRole(members: any[]): any[] {
  return [...members].sort((a, b) => (roleOrder[a.rol] ?? 99) - (roleOrder[b.rol] ?? 99))
}

/**
 * Une los canales a los que ya perteneces con los disponibles sin duplicar.
 * La entrada de "unidos" gana porque trae miRol; los disponibles solo aportan
 * canales nuevos (incluidos los privados que ve el staff).
 */
export function combinarCanales(unidos: any[], disponibles: any[]): any[] {
  const porId = new Map<number, any>()
  for (const canal of unidos) porId.set(canal.id, canal)
  for (const canal of disponibles) {
    if (!porId.has(canal.id)) porId.set(canal.id, canal)
  }
  return [...porId.values()]
}

export function solicitarPermisoNotificacion(): void {
  if (!('Notification' in window)) return
  if (Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

export function notificarPush(titulo: string, cuerpo: string): void {
  if (!('Notification' in window)) return
  if (document.hidden && Notification.permission === 'granted') {
    try {
      new Notification(titulo, { body: cuerpo, icon: '/favicon.ico' })
    } catch { /* ignore */ }
  }
}

export function truncarTexto(texto: string, max: number = 100): string {
  const clean = texto.replace(/<[^>]*>/g, '').replace(/&#64;/g, '@')
  return clean.length > max ? clean.slice(0, max) + '…' : clean
}

export async function copiarTexto(texto: string): Promise<void> {
  const clean = (texto || '').replace(/<[^>]*>/g, '').replace(/&#64;/g, '@')
  try {
    await navigator.clipboard.writeText(clean)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = clean
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
}
