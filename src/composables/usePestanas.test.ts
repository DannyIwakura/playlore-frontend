import { describe, expect, it } from 'vitest'
import { indicePestanaParaTecla } from './usePestanas'

describe('indicePestanaParaTecla', () => {
  it('avanza con las flechas derecha y abajo, con vuelta al principio', () => {
    expect(indicePestanaParaTecla('ArrowRight', 0, 3)).toBe(1)
    expect(indicePestanaParaTecla('ArrowDown', 1, 3)).toBe(2)
    expect(indicePestanaParaTecla('ArrowDown', 2, 3)).toBe(0)
  })

  it('retrocede con las flechas izquierda y arriba, con vuelta al final', () => {
    expect(indicePestanaParaTecla('ArrowLeft', 2, 3)).toBe(1)
    expect(indicePestanaParaTecla('ArrowUp', 1, 3)).toBe(0)
    expect(indicePestanaParaTecla('ArrowUp', 0, 3)).toBe(2)
  })

  it('salta a la primera y a la ultima con Home y End', () => {
    expect(indicePestanaParaTecla('Home', 2, 3)).toBe(0)
    expect(indicePestanaParaTecla('End', 0, 3)).toBe(2)
  })

  it('ignora teclas ajenas al patron y listas vacias', () => {
    expect(indicePestanaParaTecla('Enter', 1, 3)).toBeNull()
    expect(indicePestanaParaTecla('Tab', 1, 3)).toBeNull()
    expect(indicePestanaParaTecla('ArrowRight', 0, 0)).toBeNull()
  })
})
