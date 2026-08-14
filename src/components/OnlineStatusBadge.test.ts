import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import OnlineStatusBadge from './OnlineStatusBadge.vue'

describe('OnlineStatusBadge', () => {
  it('marca online/offline según la prop', () => {
    const online = mount(OnlineStatusBadge, { props: { online: true } })
    const offline = mount(OnlineStatusBadge, { props: { online: false } })
    expect(online.find('.status-dot').classes()).toEqual(expect.arrayContaining(['online']))
    expect(offline.find('.status-dot').classes()).toEqual(expect.arrayContaining(['offline']))
  })

  it('usa tamaño por defecto y los tamaños explícitos', () => {
    const md = mount(OnlineStatusBadge, { props: { online: true } })
    const sm = mount(OnlineStatusBadge, { props: { online: true, size: 'sm' } })
    const lg = mount(OnlineStatusBadge, { props: { online: true, size: 'lg' } })
    expect(md.find('.status-dot').classes()).toContain('status-md')
    expect(sm.find('.status-dot').classes()).toContain('status-sm')
    expect(lg.find('.status-dot').classes()).toContain('status-lg')
  })
})
