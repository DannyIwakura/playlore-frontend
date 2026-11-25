import { reactive, ref } from 'vue'
import api from '../../services/api'
import { anunciosApi } from '../../services/anunciosApi'
import {
  contenidoPlano,
  idsNumericos,
  MAX_ANUNCIOS_ACTIVOS,
  mensajeErrorApi,
  type AnuncioDTO,
  type CategoriaAnuncio,
} from './anuncios'

interface OpcionesGestion {
  /** Vuelve a cargar los listados que consuma la vista tras escribir. */
  recargar: () => void | Promise<void>
}

export interface EstadoEditor {
  anuncioId: number | null
  personajeId: number
}

/**
 * Lógica compartida por la pantalla «Anuncios RP» y la sección del perfil:
 * formulario con Tiptap, alta/edición, activación (con el límite de 3) y borrado.
 * La vista aporta el listado que debe recargarse y pinta los modales.
 */
export function useGestionAnuncios({ recargar }: OpcionesGestion) {
  const categoriasDisponibles = ref<CategoriaAnuncio[]>([])
  const errorCategorias = ref<string | null>(null)

  const modalEditor = ref<EstadoEditor | null>(null)
  const editor = reactive({ contenido: '', categoriaIds: [] as number[] })
  const errorEditor = ref<string | null>(null)
  const guardando = ref(false)

  const confirmacionEliminar = ref<AnuncioDTO | null>(null)
  const eliminando = ref(false)
  const aviso = ref<string | null>(null)

  async function cargarCategorias() {
    if (categoriasDisponibles.value.length > 0) return
    errorCategorias.value = null
    try {
      const { data } = await api.get<unknown>('/categorias', { params: { size: 100 } })
      const lista = data && typeof data === 'object' && 'content' in data
        ? (data as { content: unknown }).content
        : data
      categoriasDisponibles.value = Array.isArray(lista)
        ? (lista as CategoriaAnuncio[]).map((categoria) => ({
            idCategoria: Number(categoria.idCategoria),
            nombre: String(categoria.nombre ?? ''),
            tipo: String(categoria.tipo ?? ''),
          }))
        : []
    } catch {
      errorCategorias.value = 'No pudimos cargar las categorías. Puedes guardar el anuncio sin ellas.'
    }
  }

  function abrirEditor(personajeId: number, anuncio: AnuncioDTO | null = null) {
    modalEditor.value = {
      anuncioId: anuncio?.idAnuncio ?? null,
      personajeId: anuncio?.personajeId ?? personajeId,
    }
    editor.contenido = anuncio?.contenido ?? ''
    editor.categoriaIds = anuncio ? anuncio.categorias.map((c) => c.idCategoria) : []
    errorEditor.value = null
    void cargarCategorias()
  }

  function cerrarEditor() {
    modalEditor.value = null
    errorEditor.value = null
  }

  async function guardar() {
    const estado = modalEditor.value
    if (!estado || guardando.value) return

    if (!contenidoPlano(editor.contenido)) {
      errorEditor.value = 'Escribe el contenido del anuncio antes de guardarlo.'
      return
    }

    const datos = {
      contenido: editor.contenido,
      categoriaIds: idsNumericos(editor.categoriaIds),
      ...(estado.anuncioId === null ? { personajeId: estado.personajeId } : {}),
    }

    guardando.value = true
    errorEditor.value = null
    try {
      if (estado.anuncioId === null) {
        await anunciosApi.crear(datos)
      } else {
        await anunciosApi.editar(estado.anuncioId, datos)
      }
      cerrarEditor()
      await recargar()
      aviso.value = estado.anuncioId === null
        ? 'Anuncio creado. Nace inactivo: actívalo cuando quieras publicarlo.'
        : 'Anuncio actualizado correctamente.'
    } catch (error) {
      errorEditor.value = mensajeErrorApi(error, 'No pudimos guardar el anuncio. Inténtalo de nuevo.')
    } finally {
      guardando.value = false
    }
  }

  async function cambiarActivo(
    anuncio: AnuncioDTO,
    activo: boolean,
    todosLosAnuncios: readonly AnuncioDTO[],
  ) {
    if (activo) {
      const activos = todosLosAnuncios.filter(
        (otro) => otro.activo && otro.idAnuncio !== anuncio.idAnuncio,
      ).length
      if (activos >= MAX_ANUNCIOS_ACTIVOS) {
        aviso.value = `Solo puedes tener ${MAX_ANUNCIOS_ACTIVOS} anuncios activos en total. Desactiva uno antes de activar este.`
        return
      }
    }

    try {
      await anunciosApi.cambiarActivo(anuncio.idAnuncio, activo)
      await recargar()
    } catch (error) {
      aviso.value = mensajeErrorApi(error, 'No pudimos cambiar el estado del anuncio.')
    }
  }

  function pedirEliminar(anuncio: AnuncioDTO) {
    confirmacionEliminar.value = anuncio
  }

  async function confirmarEliminar() {
    const anuncio = confirmacionEliminar.value
    if (!anuncio || eliminando.value) return

    eliminando.value = true
    try {
      await anunciosApi.eliminar(anuncio.idAnuncio)
      confirmacionEliminar.value = null
      await recargar()
      aviso.value = 'Anuncio eliminado.'
    } catch (error) {
      aviso.value = mensajeErrorApi(error, 'No pudimos eliminar el anuncio. Inténtalo de nuevo.')
    } finally {
      eliminando.value = false
    }
  }

  return {
    categoriasDisponibles,
    errorCategorias,
    modalEditor,
    editor,
    errorEditor,
    guardando,
    confirmacionEliminar,
    eliminando,
    aviso,
    cargarCategorias,
    abrirEditor,
    cerrarEditor,
    guardar,
    cambiarActivo,
    pedirEliminar,
    confirmarEliminar,
  }
}
