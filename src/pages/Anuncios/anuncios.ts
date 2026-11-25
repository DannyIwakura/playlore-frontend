/**
 * Tipos y utilidades puras de la pantalla «Anuncios RP».
 *
 * El backend es la autoridad de los filtros y del límite de 3 anuncios activos
 * por cuenta; aquí solo se normaliza lo que se envía y lo que llega para que la
 * vista no tenga que repetir comprobaciones.
 */

export interface AnuncioCategoriaDTO {
  idCategoria: number
  nombre: string
  tipo: string
}

export interface AnuncioDTO {
  idAnuncio: number
  contenido: string
  activo: boolean
  fechaCreacion: string
  personajeId: number
  nombrePersonaje: string
  avatarPersonaje: string | null
  genero: string | null
  raza: string | null
  clase: string | null
  edadPersonaje: number | null
  online: boolean
  usuarioId: number
  categorias: AnuncioCategoriaDTO[]
}

export interface AnunciosRespuestaDTO {
  anuncios: AnuncioDTO[]
  hayMas: boolean
}

export interface FiltrosAnuncios {
  nombre: string
  genero: string
  raza: string
  clase: string
  // v-model.number devuelve '' al vaciar el campo, no null.
  edadMin: number | string | null
  edadMax: number | string | null
  categoriaIds: number[]
  soloOnline: boolean
}

export interface CategoriaAnuncio {
  idCategoria: number
  nombre: string
  tipo: string
}

/** Tamaño del lote aleatorio acordado con el backend. */
export const TAMANIO_LOTE = 9
/** Tope de ids ya vistos que admite el filtro del backend. */
export const MAX_EXCLUIDOS = 100
/** Un anuncio nace inactivo y solo se pueden tener 3 activos por cuenta. */
export const MAX_ANUNCIOS_ACTIVOS = 3

export type ParamsAnuncios = Record<string, string | number | boolean | number[]>

export function filtrosAnunciosVacios(): FiltrosAnuncios {
  return {
    nombre: '',
    genero: '',
    raza: '',
    clase: '',
    edadMin: null,
    edadMax: null,
    categoriaIds: [],
    soloOnline: true,
  }
}

/** Convierte una lista de query params a ids válidos, sin duplicados. */
export function idsNumericos(valores: readonly unknown[] | null | undefined): number[] {
  if (!Array.isArray(valores)) return []

  const vistos = new Set<number>()
  const resultado: number[] = []
  for (const valor of valores) {
    if (typeof valor === 'boolean' || valor === null || valor === undefined || valor === '') continue
    const numero = typeof valor === 'number' ? valor : Number(valor)
    if (!Number.isSafeInteger(numero) || numero <= 0 || vistos.has(numero)) continue
    vistos.add(numero)
    resultado.push(numero)
  }
  return resultado
}

/** Ids ya mostrados, recortados al tope que acepta `/anuncios`. */
export function idsExcluidos(anuncios: readonly AnuncioDTO[]): number[] {
  return idsNumericos(anuncios.map((anuncio) => anuncio.idAnuncio)).slice(0, MAX_EXCLUIDOS)
}

export function edadNumero(valor: number | string | null | undefined): number | null {
  if (valor === null || valor === undefined || valor === '') return null
  const numero = Number(valor)
  return Number.isSafeInteger(numero) && numero >= 0 ? numero : null
}

/**
 * Detecta entradas de edad que el mapeo normalizaría a «sin filtro»:
 * negativas, decimales o texto no numérico. Así la vista puede mostrar el error
 * en lugar de descartar silenciosamente lo que el usuario escribió.
 */
export function edadInvalida(valor: number | string | null | undefined): boolean {
  if (valor === null || valor === undefined || valor === '') return false
  const texto = String(valor).trim()
  return !/^\d+$/.test(texto) || !Number.isSafeInteger(Number(texto))
}

/**
 * Mapea los filtros de la vista a los query params del backend. Las listas se
 * envían como arrays y `serializarParamsAnuncios` las convierte en claves
 * repetidas (`categoriaIds=1&categoriaIds=2`), descartando valores no numéricos
 * o duplicados.
 */
export function mapearFiltrosAParams(
  filtros: FiltrosAnuncios,
  excluirIds: readonly number[] = [],
  size: number = TAMANIO_LOTE,
): ParamsAnuncios {
  const params: ParamsAnuncios = { size }

  if (filtros.nombre.trim()) params.nombre = filtros.nombre.trim()
  if (filtros.genero) params.genero = filtros.genero
  if (filtros.raza.trim()) params.raza = filtros.raza.trim()
  if (filtros.clase.trim()) params.clase = filtros.clase.trim()

  const min = edadNumero(filtros.edadMin)
  const max = edadNumero(filtros.edadMax)
  if (min !== null) params.edadMin = min
  if (max !== null) params.edadMax = max

  const categoriaIds = idsNumericos(filtros.categoriaIds)
  if (categoriaIds.length > 0) params.categoriaIds = categoriaIds

  const excluidos = idsNumericos(excluirIds).slice(0, MAX_EXCLUIDOS)
  if (excluidos.length > 0) params.excluirIds = excluidos

  if (filtros.soloOnline) params.soloOnline = true

  return params
}

/**
 * Axios añade corchetes a los arrays por defecto (`categoriaIds[]=1`), pero el
 * contrato del backend usa claves repetidas (`categoriaIds=1&categoriaIds=2`).
 * Serializamos aquí para no depender de la configuración global del cliente.
 */
export function serializarParamsAnuncios(params: ParamsAnuncios): string {
  const query = new URLSearchParams()
  for (const [clave, valor] of Object.entries(params)) {
    if (Array.isArray(valor)) {
      for (const item of valor) query.append(clave, String(item))
    } else {
      query.set(clave, String(valor))
    }
  }
  return query.toString()
}

export interface ResultadoLote {
  anuncios: AnuncioDTO[]
  idsVistos: number[]
  hayMas: boolean
}

/**
 * Añade un lote al listado ya pintado sin repetir anuncios. `hayMas` se apaga
 * si el lote no aportó nada nuevo para que el botón «Ver más» no se quede
 * atrapado cuando el backend no respeta `excluirIds`.
 */
export function combinarLoteAnuncios(
  actuales: readonly AnuncioDTO[],
  lote: readonly AnuncioDTO[],
  hayMas: boolean,
): ResultadoLote {
  const porId = new Map<number, AnuncioDTO>()
  for (const anuncio of actuales) porId.set(anuncio.idAnuncio, anuncio)

  let nuevos = 0
  for (const anuncio of lote) {
    if (porId.has(anuncio.idAnuncio)) continue
    porId.set(anuncio.idAnuncio, anuncio)
    nuevos++
  }

  const anuncios = Array.from(porId.values())
  return {
    anuncios,
    idsVistos: idsExcluidos(anuncios),
    hayMas: hayMas && nuevos > 0,
  }
}

/** Texto de un mensaje de error del contrato JSON `{"error": "..."}`. */
export function mensajeErrorApi(error: unknown, fallback: string): string {
  const datos = (error as { response?: { data?: unknown } } | null)?.response?.data
  if (datos && typeof datos === 'object' && 'error' in datos) {
    const mensaje = (datos as { error?: unknown }).error
    if (typeof mensaje === 'string' && mensaje.trim()) return mensaje
  }
  return fallback
}

/** Contenido visible del editor Tiptap (sin etiquetas) para validar que no esté vacío. */
export function contenidoPlano(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim()
}
