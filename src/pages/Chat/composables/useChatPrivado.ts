import { ref, type Ref } from 'vue'
import { nextTick } from 'vue'
import { chatApi } from '../../../services/chatApi'
import { characterSessionStore } from '../../../store/characterSessionStore'
import { websocketService } from '../../../services/websocket'

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

  /**
   * Carga las conversaciones de una sesion concreta. Sin argumentos usa la
   * sesion activa y actualiza los refs visibles; con `tokenJwt`/`personajeId`
   * solo devuelve el resultado para que ChatWindow lo guarde en el estado de
   * esa sesion (que puede no ser la activa).
   */
  async function cargarConversaciones(tokenJwt?: string, personajeId?: number) {
    const [pid, token] = tokenJwt != null && personajeId != null
      ? [personajeId, tokenJwt]
      : [characterSessionStore.sesionActual.value?.personajeId, characterSessionStore.getToken()]
    try {
      const { data } = await chatApi.obtenerConversaciones(token)
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
      const conversaciones = Array.from(grouped.values())
      const noLeidos = new Map<number, number>(
        conversaciones.map(c => [c.personajeId, c.noLeidos])
      )
      if (tokenJwt == null || personajeId == null) {
        conversacionesPrivadas.value = conversaciones
        noLeidosPriv.value = noLeidos
      }
      return { conversaciones, noLeidos }
    } catch {
      return { conversaciones: [] as any[], noLeidos: new Map<number, number>() }
    }
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
      const { data } = await chatApi.obtenerConversacion(conv.personajeId, characterSessionStore.getToken())
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
    const sesionId = characterSessionStore.sesionActual.value?.idSesion
    if (sesionId != null) websocketService.sendPrivateMessage(sesionId, receptorId, texto)
    // El contador de la pestaña receptora lo pone su propia conexion WS al
    // recibir el mensaje; sumarlo aqui duplicaria el aviso.
    const conv = conversacionesPrivadas.value.find(c => c.personajeId === receptorId)
    if (conv) { conv.ultimoMensaje = texto; conv.fecha = tempMsg.fechaEnvio }
  }

  function handleSendPm(texto: string) {
    enviarMensajePrivadoWs(texto)
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
    reproducirSonidoPM,
    cargarConversaciones,
    abrirConversacionPrivada,
    seleccionarConversacion,
    cerrarConversacion,
    enviarMensajePrivadoWs,
    handleSendPm,
    eliminarConversacionDeLista,
  }
}
