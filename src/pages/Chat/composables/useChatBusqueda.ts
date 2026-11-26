import { ref, watch, type Ref } from 'vue'
import { chatApi } from '../../../services/chatApi'

const RESULTADOS_POR_PAGINA = 15

export function useChatBusqueda({ canalActivo }: { canalActivo: Ref<any> }) {
  const busquedaAbierta = ref(false)
  const terminoBusqueda = ref('')
  const ultimoTerminoBuscado = ref('')
  const buscando = ref(false)
  const cargandoMas = ref(false)
  const resultados = ref<any[]>([])
  const hayMasResultados = ref(false)
  const paginaResultados = ref(0)
  const errorBusqueda = ref('')

  watch(terminoBusqueda, (valor) => {
    if (valor.trim() !== ultimoTerminoBuscado.value) {
      resultados.value = []
      hayMasResultados.value = false
      paginaResultados.value = 0
      errorBusqueda.value = ''
      if (!valor.trim()) ultimoTerminoBuscado.value = ''
    }
  })

  async function buscar(q: string) {
    const termino = (q || '').trim()
    if (!termino || !canalActivo.value) return
    terminoBusqueda.value = termino
    ultimoTerminoBuscado.value = termino
    busquedaAbierta.value = true
    buscando.value = true
    errorBusqueda.value = ''
    resultados.value = []
    paginaResultados.value = 0
    hayMasResultados.value = false
    try {
      const { data } = await chatApi.buscarMensajesCanal(
        canalActivo.value.id,
        termino,
        0,
        RESULTADOS_POR_PAGINA,
      )
      const content: any[] = data.content || []
      resultados.value = content
      hayMasResultados.value = !data.last && content.length > 0
      paginaResultados.value = 1
    } catch {
      errorBusqueda.value = 'No se pudo realizar la búsqueda'
    } finally {
      buscando.value = false
    }
  }

  async function cargarMasResultados() {
    if (cargandoMas.value || !hayMasResultados.value || !canalActivo.value) return
    cargandoMas.value = true
    try {
      const { data } = await chatApi.buscarMensajesCanal(
        canalActivo.value.id,
        terminoBusqueda.value,
        paginaResultados.value,
        RESULTADOS_POR_PAGINA,
      )
      const content: any[] = data.content || []
      const existentes = new Set(resultados.value.map((r: any) => r.id))
      const nuevos = content.filter((r: any) => !existentes.has(r.id))
      resultados.value.push(...nuevos)
      hayMasResultados.value = !data.last && nuevos.length > 0
      paginaResultados.value++
    } catch {} finally {
      cargandoMas.value = false
    }
  }

  function cerrarBusqueda() {
    busquedaAbierta.value = false
    terminoBusqueda.value = ''
    ultimoTerminoBuscado.value = ''
    resultados.value = []
    hayMasResultados.value = false
    paginaResultados.value = 0
    errorBusqueda.value = ''
  }

  function irAResultado(resultado: any) {
    busquedaAbierta.value = false
    resultados.value = []
  }

  return {
    busquedaAbierta,
    terminoBusqueda,
    ultimoTerminoBuscado,
    buscando,
    cargandoMas,
    resultados,
    hayMasResultados,
    paginaResultados,
    errorBusqueda,
    buscar,
    cargarMasResultados,
    cerrarBusqueda,
    irAResultado,
  }
}
