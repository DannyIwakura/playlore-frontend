import api from './api'
import {
  mapearFiltrosAParams,
  serializarParamsAnuncios,
  type AnunciosRespuestaDTO,
  type AnuncioDTO,
  type FiltrosAnuncios,
} from '../pages/Anuncios/anuncios'

export interface DatosAnuncio {
  contenido: string
  categoriaIds: number[]
  personajeId?: number
}

/**
 * Cliente REST de anuncios. Siempre usa el token de usuario del interceptor de
 * `api` (el perfil y la pantalla de anuncios no exigen sesión de personaje).
 */
export const anunciosApi = {
  listar(filtros: FiltrosAnuncios, excluirIds: readonly number[] = []) {
    return api.get<AnunciosRespuestaDTO>('/anuncios', {
      params: mapearFiltrosAParams(filtros, excluirIds),
      paramsSerializer: serializarParamsAnuncios,
    })
  },

  mios() {
    return api.get<AnuncioDTO[]>('/anuncios/mios')
  },

  porPersonaje(personajeId: number) {
    return api.get<AnuncioDTO[]>(`/anuncios/personaje/${personajeId}`)
  },

  crear(datos: DatosAnuncio) {
    return api.post<AnuncioDTO>('/anuncios', datos)
  },

  editar(idAnuncio: number, datos: DatosAnuncio) {
    return api.put<AnuncioDTO>(`/anuncios/${idAnuncio}`, datos)
  },

  cambiarActivo(idAnuncio: number, activo: boolean) {
    return api.patch<AnuncioDTO>(`/anuncios/${idAnuncio}/activo`, { activo })
  },

  eliminar(idAnuncio: number) {
    return api.delete(`/anuncios/${idAnuncio}`)
  },
}
