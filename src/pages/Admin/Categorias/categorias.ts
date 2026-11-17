/**
 * Metadatos y validación de las categorías de personaje.
 *
 * Los comparten el listado del panel y el formulario de alta para que las
 * etiquetas y los mensajes de error no se desincronicen entre ambos.
 */

export const TIPOS_CATEGORIA = [
  { value: 'GENERO', label: 'Género' },
  { value: 'FANDOM', label: 'Fandom' },
  { value: 'SOBRE_EL_PERSONAJE', label: 'Sobre el personaje' },
  { value: 'TIPO_DE_ESCRITURA', label: 'Tipo de escritura' },
  { value: 'TIPO_DE_TRAMA', label: 'Tipo de trama' },
] as const

export type TipoCategoria = (typeof TIPOS_CATEGORIA)[number]['value']

/** Límites que impone `CategoriaDTO` en el backend. */
export const NOMBRE_MAX = 100
export const DESCRIPCION_MAX = 500

export interface ErroresCategoria {
  nombre?: string
  descripcion?: string
}

export function etiquetaTipoCategoria(tipo: string): string {
  return TIPOS_CATEGORIA.find((opcion) => opcion.value === tipo)?.label ?? tipo
}

/**
 * Validación de cliente previa al envío. El backend sigue siendo la autoridad:
 * esto solo evita un viaje de ida y vuelta para errores evidentes.
 */
export function validarCategoria(nombre: string, descripcion: string): ErroresCategoria {
  const errores: ErroresCategoria = {}
  const nombreLimpio = nombre.trim()

  if (!nombreLimpio) {
    errores.nombre = 'Escribe el nombre de la categoría.'
  } else if (nombreLimpio.length > NOMBRE_MAX) {
    errores.nombre = `El nombre no puede superar los ${NOMBRE_MAX} caracteres.`
  }

  if (descripcion.trim().length > DESCRIPCION_MAX) {
    errores.descripcion = `La descripción no puede superar los ${DESCRIPCION_MAX} caracteres.`
  }

  return errores
}
