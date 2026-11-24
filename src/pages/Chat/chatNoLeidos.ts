/** Estado minimo necesario para contar mensajes no leidos sin duplicados. */
export interface EstadoNoLeidos {
  lastSeen: Record<number, number>
  ids: Record<number, Set<number>>
  counts: Map<number, number>
}

/**
 * Anade un mensaje al contador de un canal. Devuelve false si ya estaba
 * contado (el mismo mensaje puede llegar por WS y por recarga).
 */
export function registrarMensajeNoLeido(
  estado: EstadoNoLeidos,
  canalId: number,
  mensajeId: number
): boolean {
  if (!estado.ids[canalId]) estado.ids[canalId] = new Set()
  if (estado.ids[canalId].has(mensajeId)) return false
  estado.ids[canalId].add(mensajeId)
  estado.counts.set(canalId, estado.ids[canalId].size)
  return true
}

/**
 * Con el ultimo mensaje de un canal: la primera vez solo inicializa lastSeen
 * (el historial antiguo no es nuevo). Despues cuenta el mensaje si es posterior.
 */
export function inicializarOSumarUltimo(
  estado: EstadoNoLeidos,
  canalId: number,
  ultimoId: number
): boolean {
  if (estado.lastSeen[canalId] === undefined) {
    estado.lastSeen[canalId] = ultimoId
    return false
  }
  if (ultimoId <= estado.lastSeen[canalId]) return false
  return registrarMensajeNoLeido(estado, canalId, ultimoId)
}
