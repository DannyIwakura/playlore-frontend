import { describe, expect, it } from 'vitest'
import { parsearDmDeQuery } from './deepLinkDm'

describe('parsearDmDeQuery', () => {
  it('acepta un id numérico en un string', () => {
    expect(parsearDmDeQuery('123')).toBe(123)
    expect(parsearDmDeQuery('  7  ')).toBe(7)
  })

  it('acepta el primer valor cuando query repite el parámetro', () => {
    expect(parsearDmDeQuery(['12', '34'])).toBe(12)
  })

  it('rechaza ids vacíos, negativos, decimales y no numéricos', () => {
    expect(parsearDmDeQuery(undefined)).toBeNull()
    expect(parsearDmDeQuery(null)).toBeNull()
    expect(parsearDmDeQuery('')).toBeNull()
    expect(parsearDmDeQuery('-3')).toBeNull()
    expect(parsearDmDeQuery('1.5')).toBeNull()
    expect(parsearDmDeQuery('abc')).toBeNull()
    expect(parsearDmDeQuery('0')).toBeNull()
    expect(parsearDmDeQuery({})).toBeNull()
    expect(parsearDmDeQuery([])).toBeNull()
  })

  it('rechaza números fuera del rango seguro', () => {
    expect(parsearDmDeQuery(String(Number.MAX_SAFE_INTEGER + 1))).toBeNull()
  })
})
