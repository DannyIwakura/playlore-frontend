import { ref, computed, type Ref } from 'vue'
import { chatApi } from '../../../services/chatApi'
import { characterSessionStore } from '../../../store/characterSessionStore'

interface ModeracionDeps {
  canalActivo: Ref<any>
  contextMenuTarget: Ref<any>
  cargarMiembrosOnline: (silent?: boolean) => Promise<void>
  cerrarContextMenu: () => void
  mostrarConfirmModal: (titulo: string, texto: string, onConfirm: () => void) => void
  aviso: Ref<string | null>
}

export function useChatModeracion({
  canalActivo,
  contextMenuTarget,
  cargarMiembrosOnline,
  cerrarContextMenu,
  mostrarConfirmModal,
  aviso,
}: ModeracionDeps) {
  const miRolEnCanal = computed(() => canalActivo.value?.miRol)

  const puedeSilenciarContextMenu = computed(() => {
    const t = contextMenuTarget.value
    if (!t) return false
    if (miRolEnCanal.value !== 'OWNER' && miRolEnCanal.value !== 'ADMIN' && miRolEnCanal.value !== 'MOD') return false
    if (t.rol !== 'MEMBER') return false
    return t.personajeId !== characterSessionStore.sesionActual.value?.personajeId
  })

  const banTarget = ref<any>(null)
  const banDuracion = ref('PERMANENTE')

  const opcionesBan = [
    { value: '1H', label: '1 hora' },
    { value: '24H', label: '24 horas' },
    { value: '7D', label: '7 días' },
    { value: 'PERMANENTE', label: 'Permanente' },
  ]

  const silenciarTarget = ref<any>(null)
  const silenciarDuracion = ref('1H')
  const opcionesSilenciar = [
    { value: '1H', label: '1 hora' },
    { value: '24H', label: '24 horas' },
    { value: '7D', label: '7 días' },
  ]

  const mostrarBaneados = ref(false)
  const baneados = ref<any[]>([])
  const cargandoBaneados = ref(false)

  async function ascenderAMod(m: any) {
    cerrarContextMenu()
    mostrarConfirmModal('Ascender a moderador', `¿Ascender a ${m.personajeNombre} a moderador?`, async () => {
      try {
        await chatApi.cambiarRol(canalActivo.value!.id, m.personajeId, 'MOD')
        await cargarMiembrosOnline()
      } catch {}
    })
  }

  async function descenderAMember(m: any) {
    cerrarContextMenu()
    mostrarConfirmModal('Descender a miembro', `¿Descender a ${m.personajeNombre} a miembro?`, async () => {
      try {
        await chatApi.cambiarRol(canalActivo.value!.id, m.personajeId, 'MEMBER')
        await cargarMiembrosOnline()
      } catch {}
    })
  }

  async function expulsarDelCanal(m: any) {
    cerrarContextMenu()
    mostrarConfirmModal('Expulsar del canal', `¿Expulsar a ${m.personajeNombre} del canal?`, async () => {
      try {
        await chatApi.expulsarMiembro(canalActivo.value!.id, m.personajeId)
        await cargarMiembrosOnline()
      } catch {}
    })
  }

  function estaSilenciado(m: any): boolean {
    return !!m?.silenciadoHasta && new Date(m.silenciadoHasta).getTime() > Date.now()
  }

  function abrirBanModal(m: any) {
    cerrarContextMenu()
    banTarget.value = m
    banDuracion.value = 'PERMANENTE'
  }

  async function confirmarBan() {
    if (!banTarget.value || !canalActivo.value) return
    try {
      await chatApi.banearMiembro(canalActivo.value.id, banTarget.value.personajeId, banDuracion.value)
      banTarget.value = null
      await cargarMiembrosOnline()
    } catch {}
  }

  function abrirSilenciarModal(m: any) {
    cerrarContextMenu()
    silenciarTarget.value = m
    silenciarDuracion.value = '1H'
  }

  async function confirmarSilenciar() {
    if (!silenciarTarget.value || !canalActivo.value) return
    try {
      await chatApi.silenciarMiembro(canalActivo.value.id, silenciarTarget.value.personajeId, silenciarDuracion.value)
      silenciarTarget.value = null
      await cargarMiembrosOnline()
    } catch {}
  }

  async function desilenciar(m: any) {
    cerrarContextMenu()
    if (!canalActivo.value) return
    mostrarConfirmModal(
      'Desilenciar personaje',
      `¿Desilenciar a ${m.personajeNombre} de este canal?`,
      async () => {
        try {
          await chatApi.desilenciarMiembro(canalActivo.value!.id, m.personajeId)
          await cargarMiembrosOnline()
        } catch {}
      }
    )
  }

  async function abrirModalBaneados() {
    if (!canalActivo.value) return
    mostrarBaneados.value = true
    cargandoBaneados.value = true
    try {
      const { data } = await chatApi.listarBaneados(canalActivo.value.id)
      baneados.value = data
    } catch {
      baneados.value = []
    } finally {
      cargandoBaneados.value = false
    }
  }

  function desbanearPersonaje(p: any) {
    if (!canalActivo.value) return
    mostrarConfirmModal(
      'Desbanear personaje',
      `¿Desbanear a ${p.personajeNombre} de este canal?`,
      async () => {
        try {
          await chatApi.desbanearMiembro(canalActivo.value!.id, p.personajeId)
          baneados.value = baneados.value.filter((b: any) => b.personajeId !== p.personajeId)
        } catch {
          aviso.value = 'Error al desbanear al personaje.'
        }
      }
    )
  }

  return {
    miRolEnCanal,
    puedeSilenciarContextMenu,
    banTarget,
    banDuracion,
    opcionesBan,
    silenciarTarget,
    silenciarDuracion,
    opcionesSilenciar,
    mostrarBaneados,
    baneados,
    cargandoBaneados,
    ascenderAMod,
    descenderAMember,
    expulsarDelCanal,
    estaSilenciado,
    abrirBanModal,
    confirmarBan,
    abrirSilenciarModal,
    confirmarSilenciar,
    desilenciar,
    abrirModalBaneados,
    desbanearPersonaje,
  }
}
