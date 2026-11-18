import { describe, expect, it } from 'vitest'
import { SECCIONES_ADMIN, idDesdeHash, seccionInicial, seccionesVisibles } from './adminSecciones'

describe('seccionesVisibles', () => {
  it('un ADMIN ve todas las secciones', () => {
    expect(seccionesVisibles('ADMIN')).toHaveLength(SECCIONES_ADMIN.length)
  })

  it('un MOD no ve usuarios ni categorías', () => {
    const ids = seccionesVisibles('MOD').map((s) => s.id)
    expect(ids).not.toContain('usuarios')
    expect(ids).not.toContain('categorias')
    expect(ids).toContain('denuncias')
    expect(ids).toContain('canales')
  })

  it('un rol desconocido o sin sesión no ve ninguna sección', () => {
    expect(seccionesVisibles('USER')).toEqual([])
    expect(seccionesVisibles(null)).toEqual([])
  })

  it('no repite identificadores', () => {
    const ids = SECCIONES_ADMIN.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('idDesdeHash', () => {
  it('quita la almohadilla y los espacios', () => {
    expect(idDesdeHash('#denuncias')).toBe('denuncias')
    expect(idDesdeHash('  #baneos  ')).toBe('baneos')
  })

  it('devuelve null para un hash vacío', () => {
    expect(idDesdeHash('')).toBeNull()
    expect(idDesdeHash('#')).toBeNull()
  })
})

describe('seccionInicial', () => {
  it('respeta un hash permitido', () => {
    expect(seccionInicial('ADMIN', '#auditoria')).toBe('auditoria')
    expect(seccionInicial('MOD', '#baneos')).toBe('baneos')
  })

  it('ignora un hash que el rol no puede ver', () => {
    expect(seccionInicial('MOD', '#usuarios')).toBe('denuncias')
  })

  it('ignora un hash inexistente', () => {
    expect(seccionInicial('ADMIN', '#inventada')).toBe('denuncias')
  })

  it('cae en la primera sección disponible', () => {
    expect(seccionInicial('ADMIN')).toBe('denuncias')
    expect(seccionInicial('MOD', '')).toBe('denuncias')
  })

  it('devuelve cadena vacía sin secciones', () => {
    expect(seccionInicial('USER', '#denuncias')).toBe('')
  })
})
