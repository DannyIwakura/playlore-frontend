import { ref, computed, type Ref } from 'vue'
import { chatApi } from '../../../services/chatApi'
import { characterSessionStore } from '../../../store/characterSessionStore'
import { statusOptions, sortByRole } from '../chatUtils'

interface PresenciaDeps {
  canalActivo: Ref<any>
}

export function useChatPresencia({ canalActivo }: PresenciaDeps) {
  const onlineMap = ref<Map<number, boolean>>(new Map())
  const statusMap = ref<Map<number, string>>(new Map())
  const miembrosOnline = ref<any[]>([])
  const cargandoMiembrosOnline = ref(false)
  const mostrarSelectorEstado = ref(false)

  const estadoActual = computed(() =>
    statusMap.value.get(characterSessionStore.sesionActual.value?.personajeId ?? -1) ?? 'conectado'
  )

  const statusColor = computed(() => {
    const opt = statusOptions.find(s => s.value === estadoActual.value)
    return opt?.color ?? '#22c55e'
  })

  function getTabStatusColor(personajeId: number): string {
    const online = onlineMap.value.get(personajeId)
    if (!online) return '#9ca3af'
    const status = statusMap.value.get(personajeId)
    return statusOptions.find(s => s.value === status)?.color ?? '#22c55e'
  }

  async function cambiarEstado(valor: string) {
    const pid = characterSessionStore.sesionActual.value?.personajeId
    if (pid) {
      statusMap.value.set(pid, valor)
      statusMap.value = new Map(statusMap.value)
      try { await chatApi.actualizarStatus(pid, valor) } catch {}
    }
    mostrarSelectorEstado.value = false
  }

  async function cargarMiembrosOnline(silent = false) {
    if (!canalActivo.value) return
    if (!silent) cargandoMiembrosOnline.value = true
    try {
      const localActiveIds = new Set(characterSessionStore.sesiones.value.map(s => s.personajeId))
      const { data } = await chatApi.listarMiembros(canalActivo.value.id, 0, 100)
      const members: any[] = data.content || []
      miembrosOnline.value = sortByRole(members.filter((m: any) => m.online || localActiveIds.has(m.personajeId)))
      for (const m of members) {
        onlineMap.value.set(m.personajeId, m.online || localActiveIds.has(m.personajeId))
        if (m.status) {
          statusMap.value.set(m.personajeId, m.status)
        }
      }
      onlineMap.value = new Map(onlineMap.value)
      statusMap.value = new Map(statusMap.value)
    } catch {} finally { cargandoMiembrosOnline.value = false }
  }

  return {
    onlineMap,
    statusMap,
    miembrosOnline,
    cargandoMiembrosOnline,
    mostrarSelectorEstado,
    estadoActual,
    statusColor,
    getTabStatusColor,
    cambiarEstado,
    cargarMiembrosOnline,
  }
}
