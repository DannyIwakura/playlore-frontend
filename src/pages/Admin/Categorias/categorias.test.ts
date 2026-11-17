import { describe, expect, it } from 'vitest'
import {
  DESCRIPCION_MAX,
  NOMBRE_MAX,
  TIPOS_CATEGORIA,
  etiquetaTipoCategoria,
  validarCategoria,
} from './categorias'

describe('etiquetaTipoCategoria', () => {
  it('traduce los tipos conocidos', () => {
    expect(etiquetaTipoCategoria('GENERO')).toBe('Género')
    expect(etiquetaTipoCategoria('TIPO_DE_TRAMA')).toBe('Tipo de trama')
  })

  it('devuelve el valor crudo si el backend añade un tipo nuevo', () => {
    expect(etiquetaTipoCategoria('NUEVO')).toBe('NUEVO')
  })

  it('no repite valores', () => {
    const valores = TIPOS_CATEGORIA.map((tipo) => tipo.value)
    expect(new Set(valores).size).toBe(valores.length)
  })
})

describe('validarCategoria', () => {
  it('acepta un nombre y una descripción normales', () => {
    expect(validarCategoria('Fantasía oscura', 'Historias con tono sombrío.')).toEqual({})
  })

  it('exige el nombre', () => {
    expect(validarCategoria('   ', '')).toEqual({ nombre: 'Escribe el nombre de la categoría.' })
  })

  it('rechaza un nombre por encima del límite', () => {
    const errores = validarCategoria('a'.repeat(NOMBRE_MAX + 1), '')
    expect(errores.nombre).toContain(String(NOMBRE_MAX))
  })

  it('rechaza una descripción por encima del límite', () => {
    const errores = validarCategoria('Trama', 'a'.repeat(DESCRIPCION_MAX + 1))
    expect(errores.descripcion).toContain(String(DESCRIPCION_MAX))
  })

  it('no cuenta los espacios sobrantes de los extremos', () => {
    expect(validarCategoria(`  ${'a'.repeat(NOMBRE_MAX)}  `, '')).toEqual({})
  })
})
