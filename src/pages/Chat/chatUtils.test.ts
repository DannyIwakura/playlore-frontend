import { describe, expect, it } from 'vitest'
import {
  avatarUrl,
  canalAvatar,
  formatFecha,
  getStatusColor,
  sortByRole,
  truncarTexto,
  roleOrder,
} from './chatUtils'

describe('chatUtils', () => {
  describe('avatarUrl', () => {
    it('devuelve el avatar por defecto cuando no hay avatar', () => {
      expect(avatarUrl(null)).toBe('/api/images/AVATAR.png')
      expect(avatarUrl(undefined)).toBe('/api/images/AVATAR.png')
      expect(avatarUrl('https://x/AVATAR.png')).toBe('/api/images/AVATAR.png')
    })

    it('respeta las URLs absolutas', () => {
      expect(avatarUrl('https://cdn.example.com/a.png')).toBe('https://cdn.example.com/a.png')
    })

    it('prefija las rutas relativas con la base API', () => {
      expect(avatarUrl('/uploads/avatar1.png')).toBe('/api/uploads/avatar1.png')
    })
  })

  describe('canalAvatar', () => {
    it('genera ui-avatars con el nombre codificado cuando no hay imagen', () => {
      expect(canalAvatar({ nombre: 'Canal A', imagenUrl: null })).toContain(
        `name=${encodeURIComponent('Canal A')}`,
      )
      expect(canalAvatar('Canal A')).toContain(`name=${encodeURIComponent('Canal A')}`)
    })

    it('usa la URL absoluta de imagen cuando existe', () => {
      expect(canalAvatar({ nombre: 'Canal A', imagenUrl: 'https://x/c.png' })).toBe(
        'https://x/c.png',
      )
    })

    it('prefija las rutas relativas de imagen con la base API', () => {
      expect(canalAvatar({ nombre: 'Canal A', imagenUrl: '/uploads/c.png' })).toBe(
        '/api/uploads/c.png',
      )
    })
  })

  describe('formatFecha', () => {
    it('formatea momentos recientes', () => {
      expect(formatFecha(new Date().toISOString())).toBe('ahora')
      expect(formatFecha(new Date(Date.now() - 5 * 60000 - 30000).toISOString())).toBe('hace 5 min')
      expect(formatFecha(new Date(Date.now() - 2 * 3600000 - 30000).toISOString())).toBe('hace 2 h')
    })

    it('formatea fechas antiguas como fecha corta', () => {
      const out = formatFecha('2020-01-01T00:00:00Z')
      expect(out).not.toBe('ahora')
      expect(out).toMatch(/^\d{2} \w+/)
    })
  })

  describe('getStatusColor', () => {
    it('devuelve el color del estado o el por defecto', () => {
      expect(getStatusColor('ocupado')).toBe('#ef4444')
      expect(getStatusColor('ausente')).toBe('#eab308')
      expect(getStatusColor(undefined)).toBe('#22c55e')
      expect(getStatusColor('inexistente')).toBe('#22c55e')
    })
  })

  describe('sortByRole', () => {
    it('ordena por jerarquía de rol y no muta el original', () => {
      const members = [
        { personajeId: 1, rol: 'MEMBER' },
        { personajeId: 2, rol: 'OWNER' },
        { personajeId: 3, rol: 'MOD' },
        { personajeId: 4, rol: 'ADMIN' },
      ]
      const sorted = sortByRole(members)
      expect(sorted.map(m => m.personajeId)).toEqual([2, 4, 3, 1])
      expect(members.map(m => m.personajeId)).toEqual([1, 2, 3, 4])
    })

    it('mantiene el orden relativo dentro del mismo rol', () => {
      const members = [
        { personajeId: 1, rol: 'MEMBER' },
        { personajeId: 2, rol: 'MEMBER' },
      ]
      expect(sortByRole(members).map(m => m.personajeId)).toEqual([1, 2])
    })

    it('roles desconocidos van al final', () => {
      const members = [
        { personajeId: 1, rol: 'INVITADO' },
        { personajeId: 2, rol: 'OWNER' },
      ]
      expect(sortByRole(members).map(m => m.personajeId)).toEqual([2, 1])
      expect(roleOrder.OWNER).toBe(0)
    })
  })

  describe('truncarTexto', () => {
    it('limpia HTML y decodifica las menciones', () => {
      expect(truncarTexto('<p><strong>hola</strong></p> &#64;todos')).toBe('hola @todos')
    })

    it('trunca con elipsis por encima del máximo', () => {
      const largo = 'a'.repeat(120)
      const out = truncarTexto(largo, 100)
      expect(out).toHaveLength(101)
      expect(out.endsWith('…')).toBe(true)
    })
  })
})
