import { ref, type Ref } from 'vue'
import { nextTick } from 'vue'
import { chatApi } from '../../../services/chatApi'
import { characterSessionStore } from '../../../store/characterSessionStore'
import { websocketService } from '../../../services/websocket'
import { notificarPush, truncarTexto } from '../chatUtils'

interface PrivadoDeps {
  canalActivo: Ref<any>
  conversacionActiva: Ref<any>
  scrollAlFinal: () => void
  cerrarContextMenu: () => void
}

export function useChatPrivado({ canalActivo, conversacionActiva, scrollAlFinal, cerrarContextMenu }: PrivadoDeps) {
  const conversacionesPrivadas = ref<any[]>([])
  const mensajesPrivados = ref<any[]>([])
  const noLeidosPriv = ref<Map<number, number>>(new Map())
  const noLeidosCharacter = ref<Map<number, number>>(new Map())
  const cargandoPriv = ref(false)
  const conversacionCtxTarget = ref<any>(null)
  const conversacionCtxX = ref(0)
  const conversacionCtxY = ref(0)

  function reproducirSonidoPM() {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.25, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12)
      osc.start()
      osc.stop(ctx.currentTime + 0.12)
    } catch { /* ignore */ }
  }

  async function cargarConversaciones() {
    try {
      const { data } = await chatApi.obtenerConversaciones()
      const pid = characterSessionStore.sesionActual.value?.personajeId
      const grouped = new Map<number, any>()
      for (const msg of data) {
        const esReceptor = msg.receptorId === pid
        const otroId = esReceptor ? msg.emisorId : msg.receptorId
        if (!grouped.has(otroId)) {
          grouped.set(otroId, {
            personajeId: otroId,
            personajeNombre: esReceptor ? msg.emisorNombre : msg.receptorNombre,
            personajeAvatar: esReceptor ? msg.emisorAvatar : msg.receptorAvatar,
            ultimoMensaje: msg.contenido,
            fecha: msg.fechaEnvio,
            noLeidos: 0,
          })
        }
        if (esReceptor && !msg.leido) {
          grouped.get(otroId)!.noLeidos++
        }
      }
      conversacionesPrivadas.value = Array.from(grouped.values())
      noLeidosPriv.value = new Map(
        Array.from(grouped.values()).map(c => [c.personajeId, c.noLeidos])
      )
    } catch {}
  }

  function abrirConversacionPrivada(otroId: number, otroNombre: string, otroAvatar: string) {
    cerrarContextMenu()
    let conv = conversacionesPrivadas.value.find(c => c.personajeId === otroId)
    if (!conv) {
      conv = { personajeId: otroId, personajeNombre: otroNombre, personajeAvatar: otroAvatar, ultimoMensaje: '', noLeidos: 0 }
      conversacionesPrivadas.value.unshift(conv)
    }
    seleccionarConversacion(conv)
  }

  async function seleccionarConversacion(conv: any) {
    canalActivo.value = null
    conversacionActiva.value = conv
    noLeidosPriv.value.set(conv.personajeId, 0)
    noLeidosPriv.value = new Map(noLeidosPriv.value)
    const pid = characterSessionStore.sesionActual.value?.personajeId
    if (pid != null) {
      noLeidosCharacter.value.set(pid, 0)
      noLeidosCharacter.value = new Map(noLeidosCharacter.value)
    }
    cargandoPriv.value = true
    try {
      const { data } = await chatApi.obtenerConversacion(conv.personajeId)
      mensajesPrivados.value = data || []
      await nextTick()
      scrollAlFinal()
    } catch { mensajesPrivados.value = [] }
    finally { cargandoPriv.value = false }
  }

  function cerrarConversacion() {
    conversacionActiva.value = null
    mensajesPrivados.value = []
  }

  function enviarMensajePrivadoWs(texto: string) {
    if (!texto || !conversacionActiva.value) return
    const tempMsg: any = {
      id: Date.now(),
      emisorId: characterSessionStore.sesionActual.value?.personajeId,
      receptorId: conversacionActiva.value.personajeId,
      contenido: texto,
      fechaEnvio: new Date().toISOString(),
      esMio: true,
      leido: false,
    }
    mensajesPrivados.value.push(tempMsg)
    nextTick(() => scrollAlFinal())
    const receptorId = conversacionActiva.value.personajeId
    websocketService.sendPrivateMessage(receptorId, texto)
    if (characterSessionStore.sesiones.value.some(s => s.personajeId === receptorId)) {
      const charCount = noLeidosCharacter.value.get(receptorId) || 0
      noLeidosCharacter.value.set(receptorId, charCount + 1)
      noLeidosCharacter.value = new Map(noLeidosCharacter.value)
      reproducirSonidoPM()
      notificarPush('Mensaje privado', truncarTexto(texto))
    }
    const conv = conversacionesPrivadas.value.find(c => c.personajeId === receptorId)
    if (conv) { conv.ultimoMensaje = texto; conv.fecha = tempMsg.fechaEnvio }
  }

  function handleSendPm(texto: string) {
    enviarMensajePrivadoWs(texto)
  }

  function abrirContextMenuConversacion(e: MouseEvent, conv: any) {
    e.preventDefault()
    conversacionCtxTarget.value = conv
    const menuW = 200, menuH = 80
    const maxX = window.innerWidth - menuW
    const maxY = window.innerHeight - menuH
    conversacionCtxX.value = Math.min(e.clientX, maxX)
    conversacionCtxY.value = Math.min(e.clientY, maxY)
  }

  function cerrarContextMenuConversacion() {
    conversacionCtxTarget.value = null
  }

  function eliminarConversacionPrivada() {
    const conv = conversacionCtxTarget.value
    if (!conv) return
    eliminarConversacionDeLista(conv)
    cerrarContextMenuConversacion()
  }

  function eliminarConversacionDirecta(conv: any) {
    eliminarConversacionDeLista(conv)
  }

  async function eliminarConversacionDeLista(conv: any) {
    try {
      await chatApi.eliminarConversacion(conv.personajeId)
    } catch {
      return
    }
    if (conversacionActiva.value?.personajeId === conv.personajeId) {
      cerrarConversacion()
    }
    conversacionesPrivadas.value = conversacionesPrivadas.value.filter(
      c => c.personajeId !== conv.personajeId
    )
    noLeidosPriv.value.delete(conv.personajeId)
    noLeidosPriv.value = new Map(noLeidosPriv.value)
  }

  return {
    conversacionesPrivadas,
    mensajesPrivados,
    noLeidosPriv,
    noLeidosCharacter,
    cargandoPriv,
    conversacionCtxTarget,
    conversacionCtxX,
    conversacionCtxY,
    reproducirSonidoPM,
    cargarConversaciones,
    abrirConversacionPrivada,
    seleccionarConversacion,
    cerrarConversacion,
    enviarMensajePrivadoWs,
    handleSendPm,
    abrirContextMenuConversacion,
    cerrarContextMenuConversacion,
    eliminarConversacionPrivada,
    eliminarConversacionDirecta,
    eliminarConversacionDeLista,
  }
}
