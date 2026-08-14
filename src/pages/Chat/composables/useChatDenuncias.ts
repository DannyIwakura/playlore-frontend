import { ref, type Ref } from 'vue'
import api from '../../../services/api'

interface DenunciasDeps {
  canalActivo: Ref<any>
  cerrarContextMenu: () => void
  aviso: Ref<string | null>
}

export function useChatDenuncias({ canalActivo, cerrarContextMenu, aviso }: DenunciasDeps) {
  const denunciaTarget = ref<{ tipo: 'MENSAJE_CANAL' | 'CANAL', tipoId: number } | null>(null)
  const denunciaMotivo = ref('')
  const denunciaDetalle = ref('')
  const enviandoDenuncia = ref(false)

  function denunciarMensaje(msg: any) {
    cerrarContextMenu()
    denunciaTarget.value = { tipo: 'MENSAJE_CANAL', tipoId: msg.id }
    denunciaMotivo.value = ''
    denunciaDetalle.value = ''
  }

  function denunciarCanalActivo() {
    if (!canalActivo.value) return
    denunciaTarget.value = { tipo: 'CANAL', tipoId: canalActivo.value.id }
    denunciaMotivo.value = ''
    denunciaDetalle.value = ''
  }

  async function enviarDenunciaMensaje() {
    if (!denunciaTarget.value) return
    if (!denunciaMotivo.value.trim()) {
      aviso.value = 'El motivo es obligatorio para enviar la denuncia.'
      return
    }
    enviandoDenuncia.value = true
    try {
      await api.post('/denuncias', {
        tipo: denunciaTarget.value.tipo,
        tipoId: denunciaTarget.value.tipoId,
        motivo: denunciaMotivo.value.trim(),
        detalle: denunciaDetalle.value.trim() || null,
      })
      denunciaTarget.value = null
      denunciaMotivo.value = ''
      denunciaDetalle.value = ''
      aviso.value = 'Denuncia enviada. Gracias por ayudar a mantener el canal seguro.'
    } catch (e: any) {
      const data = e?.response?.data
      const mensaje = data?.error || data?.message || data?.mensaje || 'Error al enviar la denuncia.'
      aviso.value = mensaje
    } finally {
      enviandoDenuncia.value = false
    }
  }

  return {
    denunciaTarget,
    denunciaMotivo,
    denunciaDetalle,
    enviandoDenuncia,
    denunciarMensaje,
    denunciarCanalActivo,
    enviarDenunciaMensaje,
  }
}
