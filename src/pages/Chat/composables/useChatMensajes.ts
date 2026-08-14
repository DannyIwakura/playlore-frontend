import { ref, type Ref } from 'vue'
import { nextTick } from 'vue'
import { chatApi } from '../../../services/chatApi'
import { characterSessionStore } from '../../../store/characterSessionStore'
import { websocketService } from '../../../services/websocket'
import { copiarTexto } from '../chatUtils'

interface ChatEditorRef {
  enfocar?: () => void
  setContenido?: (texto: string) => void
  limpiar?: () => void
}

interface MensajesDeps {
  canalActivo: Ref<any>
  PAGE_SIZE: number
  channelLastSeenIds: Ref<Record<number, number>>
  channelMentionedMap: Ref<Map<number, boolean>>
  chatEditorRef: Ref<ChatEditorRef | null>
  verPerfil: (personajeId: number) => void
}

export function useChatMensajes({
  canalActivo,
  PAGE_SIZE,
  channelLastSeenIds,
  channelMentionedMap,
  chatEditorRef,
  verPerfil,
}: MensajesDeps) {
  const mensajes = ref<any[]>([])
  const cargando = ref(true)
  const enviando = ref(false)
  const cargandoMas = ref(false)
  const hayMasMensajes = ref(true)
  const usuarioScrolledUp = ref(false)
  const errorMsg = ref('')
  const pagina = ref(0)
  const mensajeEnRespuesta = ref<any | null>(null)
  const modoEdicion = ref<any | null>(null)
  const mensajeDestacado = ref<number | null>(null)
  const mensajesContainer = ref<HTMLElement | null>(null)
  const mostrarConfirmacionEliminar = ref(false)
  const mensajeAEliminarId = ref<number | null>(null)

  function scrollAlFinal() {
    nextTick(() => {
      if (mensajesContainer.value) {
        mensajesContainer.value.scrollTop = mensajesContainer.value.scrollHeight
      }
    })
  }

  function scrollAlFinalForzado() {
    usuarioScrolledUp.value = false
    scrollAlFinal()
  }

  async function cargarMensajesAntiguos() {
    if (cargandoMas.value || !hayMasMensajes.value || !canalActivo.value) return
    cargandoMas.value = true
    const nextPage = pagina.value + 1
    try {
      const { data } = await chatApi.obtenerMensajesCanal(canalActivo.value.id, nextPage, PAGE_SIZE)
      const content: any[] = data.content || []
      if (content.length === 0) { hayMasMensajes.value = false; return }
      hayMasMensajes.value = !data.last
      pagina.value = nextPage
      const container = mensajesContainer.value
      const prevScrollHeight = container?.scrollHeight ?? 0
      const prevScrollTop = container?.scrollTop ?? 0
      content.reverse().forEach((msg: any) => {
        if (!mensajes.value.some((m: any) => m.id === msg.id)) {
          mensajes.value.unshift(msg)
        }
      })
      if (container) {
        await nextTick()
        container.scrollTop = container.scrollHeight - prevScrollHeight + prevScrollTop
      }
    } catch {} finally { cargandoMas.value = false }
  }

  function handleScroll() {
    const container = mensajesContainer.value
    if (!container) return
    usuarioScrolledUp.value = container.scrollTop < container.scrollHeight - container.clientHeight - 100
    if (container.scrollTop <= 60) cargarMensajesAntiguos()
  }

  function handleMentionClick(e: MouseEvent) {
    const target = e.target as HTMLElement
    const anchor = target.closest('a')
    if (!anchor) return
    const href = anchor.getAttribute('href') || ''
    const match = href.match(/^profile:(\d+)$/)
    if (match) {
      e.preventDefault()
      verPerfil(parseInt(match[1]))
    }
  }

  function handleSendCanal(texto: string) {
    if (modoEdicion.value) {
      ejecutarEdicion(texto)
    } else {
      enviarMensaje(texto)
    }
  }

  async function enviarMensaje(texto: string) {
    if (!texto || enviando.value || !canalActivo.value) return
    channelMentionedMap.value.set(canalActivo.value.id, false)
    channelMentionedMap.value = new Map(channelMentionedMap.value)
    enviando.value = true
    const mensajePadreId = mensajeEnRespuesta.value?.id ?? null
    const token = characterSessionStore.getToken()
    if (websocketService.connected.value && token) {
      websocketService.sendChannelMessage(canalActivo.value.id, texto, mensajePadreId)
      mensajeEnRespuesta.value = null
      enviando.value = false
    } else {
      try {
        await chatApi.enviarMensajeCanal(canalActivo.value.id, texto, mensajePadreId)
        mensajeEnRespuesta.value = null
        pagina.value = 0
        const { data } = await chatApi.obtenerMensajesCanal(canalActivo.value.id, 0, PAGE_SIZE)
        hayMasMensajes.value = !data.last
        mensajes.value = (data.content || []).reverse()
        usuarioScrolledUp.value = false
        scrollAlFinal()
      } catch {} finally { enviando.value = false }
    }
  }

  function iniciarRespuesta(msg: any) {
    mensajeEnRespuesta.value = msg
    modoEdicion.value = null
    nextTick(() => chatEditorRef.value?.enfocar?.())
  }

  function iniciarEdicion(msg: any) {
    modoEdicion.value = msg
    mensajeEnRespuesta.value = null
    nextTick(() => {
      chatEditorRef.value?.setContenido?.(msg.contenido)
      chatEditorRef.value?.enfocar?.()
    })
  }

  function copiarMensaje(msg: any) {
    copiarTexto(msg.contenido || '')
  }

  function cancelarEdicion() {
    modoEdicion.value = null
    chatEditorRef.value?.limpiar?.()
  }

  async function ejecutarEdicion(texto: string) {
    const msg = modoEdicion.value
    if (!texto || enviando.value || !canalActivo.value || !msg) return
    if (msg.contenido === texto) {
      modoEdicion.value = null
      chatEditorRef.value?.limpiar?.()
      return
    }
    enviando.value = true
    try {
      await chatApi.editarMensajeCanal(canalActivo.value.id, msg.id, texto)
      const idx = mensajes.value.findIndex((m: any) => m.id === msg.id)
      if (idx >= 0) {
        mensajes.value[idx] = { ...mensajes.value[idx], contenido: texto, editado: true }
      }
    } catch {}
    enviando.value = false
    modoEdicion.value = null
    chatEditorRef.value?.limpiar?.()
  }

  function scrollAMensaje(mensajeId: number) {
    const el = document.querySelector<HTMLElement>(`.msg-row[data-msg-id="${mensajeId}"]`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    mensajeDestacado.value = null
    nextTick(() => {
      mensajeDestacado.value = mensajeId
      setTimeout(() => {
        if (mensajeDestacado.value === mensajeId) mensajeDestacado.value = null
      }, 2000)
    })
  }

  async function eliminarMensaje(mensajeId: number) {
    if (modoEdicion.value?.id === mensajeId) {
      modoEdicion.value = null
      chatEditorRef.value?.limpiar?.()
    }
    mensajeAEliminarId.value = mensajeId
    mostrarConfirmacionEliminar.value = true
  }

  async function ejecutarEliminarMensaje() {
    const mensajeId = mensajeAEliminarId.value
    if (!mensajeId || !canalActivo.value) return
    try {
      await chatApi.eliminarMensajeCanal(canalActivo.value.id, mensajeId)
      const msg = mensajes.value.find((m: any) => m.id === mensajeId)
      if (msg) {
        msg.eliminado = true
        msg.eliminadoPorModerador = esAdminOrOwner()
      }
    } catch {}
    mostrarConfirmacionEliminar.value = false
    mensajeAEliminarId.value = null
  }

  function esAdminOrOwner(): boolean {
    const rol = canalActivo.value?.miRol
    return rol === 'OWNER' || rol === 'ADMIN' || rol === 'MOD'
  }

  async function refrescarMensajesActivos() {
    if (!canalActivo.value || canalActivo.value.id == null) return
    try {
      const { data } = await chatApi.obtenerMensajesCanal(canalActivo.value.id, 0, PAGE_SIZE)
      const content: any[] = data.content || []
      const servidor = new Map(content.map((m: any) => [m.id, m]))
      const pid = characterSessionStore.sesionActual.value?.personajeId
      const nuevo: any[] = []
      for (const m of mensajes.value) {
        const srv = servidor.get(m.id)
        if (srv) {
          srv.esMio = srv.personajeId === pid
          nuevo.push(srv)
          servidor.delete(m.id)
        } else {
          nuevo.push(m)
        }
      }
      const nuevosArr = [...servidor.values()]
        .map((m: any) => { m.esMio = m.personajeId === pid; return m })
        .sort((a: any, b: any) => new Date(a.fechaEnvio).getTime() - new Date(b.fechaEnvio).getTime())
      for (const m of nuevosArr) {
        const idx = nuevo.findIndex((x: any) => new Date(x.fechaEnvio).getTime() > new Date(m.fechaEnvio).getTime())
        if (idx >= 0) nuevo.splice(idx, 0, m)
        else nuevo.push(m)
      }
      mensajes.value = nuevo
    } catch {}
  }

  return {
    mensajes,
    cargando,
    enviando,
    cargandoMas,
    hayMasMensajes,
    usuarioScrolledUp,
    errorMsg,
    pagina,
    mensajeEnRespuesta,
    modoEdicion,
    mensajeDestacado,
    mensajesContainer,
    mostrarConfirmacionEliminar,
    mensajeAEliminarId,
    scrollAlFinal,
    scrollAlFinalForzado,
    cargarMensajesAntiguos,
    handleScroll,
    handleMentionClick,
    handleSendCanal,
    enviarMensaje,
    iniciarRespuesta,
    iniciarEdicion,
    copiarMensaje,
    cancelarEdicion,
    ejecutarEdicion,
    scrollAMensaje,
    eliminarMensaje,
    ejecutarEliminarMensaje,
    esAdminOrOwner,
    refrescarMensajesActivos,
  }
}
