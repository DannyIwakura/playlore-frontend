/**
 * Parseo del deep-link `/chat?dm=<personajeId>` usado por los anuncios RP.
 * `route.query` puede traer un string, un array o undefined; solo aceptamos un
 * id entero positivo y seguro para no construir rutas ni peticiones raramente
 * formadas.
 */
export function parsearDmDeQuery(valor: unknown): number | null {
  const crudo = Array.isArray(valor) ? valor[0] : valor
  if (typeof crudo !== 'string' && typeof crudo !== 'number') return null

  const texto = String(crudo).trim()
  if (!/^\d+$/.test(texto)) return null

  const id = Number(texto)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}
