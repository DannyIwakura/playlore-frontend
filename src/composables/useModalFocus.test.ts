import { describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, nextTick, ref } from 'vue'
import { useModalFocus } from './useModalFocus'

const Wrapper = defineComponent({
  template: `
    <div ref="containerRef" tabindex="-1" role="dialog" aria-modal="true">
      <button class="primero">A</button>
      <button class="ultimo">B</button>
    </div>
  `,
  setup() {
    const containerRef = ref<HTMLElement | null>(null)
    const cerrar = vi.fn()
    useModalFocus({ containerRef, cerrar })
    return { containerRef, cerrar }
  },
})

function montar(): { wrapper: VueWrapper; cerrar: ReturnType<typeof vi.fn> } {
  const wrapper = mount(Wrapper, { attachTo: document.body })
  return { wrapper, cerrar: (wrapper.vm as unknown as { cerrar: () => void }).cerrar }
}

describe('useModalFocus', () => {
  it('enfoca el diálogo al montar si no hay autofocus', async () => {
    const { wrapper } = montar()
    await nextTick()
    const dialog = wrapper.find('[role="dialog"]').element
    expect(document.activeElement).toBe(dialog)
    wrapper.unmount()
  })

  it('cierra con Escape', async () => {
    const { wrapper, cerrar } = montar()
    await wrapper.find('[role="dialog"]').trigger('keydown', { key: 'Escape' })
    expect(cerrar).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('mantiene el foco dentro del diálogo (Tab al llegar al último vuelve al primero)', async () => {
    const { wrapper } = montar()
    const primero = wrapper.find('.primero')
    const ultimo = wrapper.find('.ultimo')
    ultimo.element.focus()
    expect(document.activeElement).toBe(ultimo.element)

    await ultimo.trigger('keydown', { key: 'Tab' })
    expect(document.activeElement).toBe(primero.element)
    wrapper.unmount()
  })

  it('con Shift+Tab desde el primero vuelve al último', async () => {
    const { wrapper } = montar()
    const primero = wrapper.find('.primero')
    const ultimo = wrapper.find('.ultimo')
    primero.element.focus()
    await primero.trigger('keydown', { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(ultimo.element)
    wrapper.unmount()
  })

  it('restaura el foco al elemento previo al desmontar', async () => {
    const previo = document.createElement('button')
    previo.id = 'elemento-previo'
    document.body.appendChild(previo)
    previo.focus()
    try {
      const { wrapper } = montar()
      await nextTick()
      expect(document.activeElement).toBe(wrapper.find('[role="dialog"]').element)
      wrapper.unmount()
      expect(document.activeElement).toBe(previo)
    } finally {
      previo.remove()
    }
  })
})
