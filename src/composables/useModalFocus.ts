import { onMounted, onUnmounted, type Ref } from 'vue'

interface UseModalFocusOptions {
  containerRef: Ref<HTMLElement | null>
  cerrar: () => void
}

const SELECTOR_ENFOCABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function useModalFocus({ containerRef, cerrar }: UseModalFocusOptions) {
  let elementoPrevio: Element | null = null

  function enfocables(): HTMLElement[] {
    const cont = containerRef.value
    if (!cont) return []
    return Array.from(cont.querySelectorAll<HTMLElement>(SELECTOR_ENFOCABLE))
  }

  function manejarKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      e.preventDefault()
      cerrar()
      return
    }
    if (e.key !== 'Tab') return
    const lista = enfocables()
    if (lista.length === 0) {
      e.preventDefault()
      return
    }
    const primero = lista[0]
    const ultimo = lista[lista.length - 1]
    const activo = document.activeElement
    const dentro = !!activo && containerRef.value?.contains(activo)
    if (e.shiftKey && (!dentro || activo === primero)) {
      e.preventDefault()
      ultimo.focus()
    } else if (!e.shiftKey && activo === ultimo) {
      e.preventDefault()
      primero.focus()
    }
  }

  onMounted(() => {
    elementoPrevio = document.activeElement
    const cont = containerRef.value
    if (cont) {
      // Si el contenido pide autofocus, se enfoca ese campo; si no, el dialogo.
      // El atributo autofocus por si solo no basta cuando el modal se monta
      // despues de cargar la pagina.
      const autoenfocable = cont.querySelector<HTMLElement>('[autofocus]')
      if (autoenfocable) {
        autoenfocable.focus()
      } else {
        const dialogo = cont.querySelector<HTMLElement>('[role="dialog"]') ?? cont
        dialogo.focus()
      }
      cont.addEventListener('keydown', manejarKeydown)
    }
  })

  onUnmounted(() => {
    containerRef.value?.removeEventListener('keydown', manejarKeydown)
    if (elementoPrevio instanceof HTMLElement) elementoPrevio.focus()
  })

  return {}
}
