import { describe, expect, it } from 'vitest'
import { inicializarOSumarUltimo, registrarMensajeNoLeido, type EstadoNoLeidos } from './chatNoLeidos'

function estado(): EstadoNoLeidos {
  return { lastSeen: {}, ids: {}, counts: new Map() }
}

describe('contadores de no leídos', () => {
  it('la primera carga fija lastSeen sin marcar el canal como no leído', () => {
    const e = estado()

    expect(inicializarOSumarUltimo(e, 5, 100)).toBe(false)

    expect(e.lastSeen[5]).toBe(100)
    expect(e.counts.get(5)).toBeUndefined()
  })

  it('cuenta solo mensajes posteriores a lastSeen', () => {
    const e = estado()
    inicializarOSumarUltimo(e, 5, 100)

    expect(inicializarOSumarUltimo(e, 5, 99)).toBe(false)
    expect(inicializarOSumarUltimo(e, 5, 101)).toBe(true)

    expect(e.counts.get(5)).toBe(1)
    expect(e.lastSeen[5]).toBe(100)
  })

  it('no cuenta dos veces el mismo mensaje (WS + recarga)', () => {
    const e = estado()
    registrarMensajeNoLeido(e, 5, 101)

    expect(inicializarOSumarUltimo(e, 5, 101)).toBe(false)
    expect(registrarMensajeNoLeido(e, 5, 101)).toBe(false)
    expect(e.counts.get(5)).toBe(1)
  })

  it('el contador crece con mensajes distintos', () => {
    const e = estado()
    registrarMensajeNoLeido(e, 5, 101)
    registrarMensajeNoLeido(e, 5, 102)

    expect(e.counts.get(5)).toBe(2)
  })
})
