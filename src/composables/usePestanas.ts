/**
 * Navegacion de teclado del patron ARIA de pestanas.
 *
 * Devuelve el indice que debe recibir el foco y la seleccion para la tecla
 * pulsada, o `null` si la tecla no forma parte del patron. Se soportan los
 * cuatro cursores porque la lista de pestanas es vertical en escritorio y
 * horizontal en movil.
 */
export function indicePestanaParaTecla(
  tecla: string,
  indiceActual: number,
  total: number
): number | null {
  if (total <= 0) return null

  switch (tecla) {
    case 'ArrowRight':
    case 'ArrowDown':
      return (indiceActual + 1) % total
    case 'ArrowLeft':
    case 'ArrowUp':
      return (indiceActual - 1 + total) % total
    case 'Home':
      return 0
    case 'End':
      return total - 1
    default:
      return null
  }
}
