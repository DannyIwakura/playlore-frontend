export const AVATAR_DEFECTO = `${import.meta.env.VITE_API_URL}/images/AVATAR.png`

export const statusOptions = [
  { value: 'conectado', label: 'Conectado', icon: 'bi-circle-fill', color: '#22c55e' },
  { value: 'ausente', label: 'Ausente', icon: 'bi-clock-fill', color: '#eab308' },
  { value: 'ocupado', label: 'Ocupado', icon: 'bi-dash-circle-fill', color: '#ef4444' },
  { value: 'no molestar', label: 'No molestar', icon: 'bi-ban-fill', color: '#a855f7' },
]

export const roleOrder: Record<string, number> = { OWNER: 0, ADMIN: 1, MOD: 2, MEMBER: 3 }

export function avatarUrl(avatar: string | null | undefined): string {
  if (!avatar || avatar.includes('AVATAR.png')) return AVATAR_DEFECTO
  if (avatar.startsWith('http')) return avatar
  return `${import.meta.env.VITE_API_URL}${avatar}`
}

export function canalAvatar(nombre: string): string {
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
