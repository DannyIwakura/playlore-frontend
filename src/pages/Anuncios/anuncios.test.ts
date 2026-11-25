import { describe, expect, it } from 'vitest'
import {
  combinarLoteAnuncios,
  contenidoPlano,
  edadInvalida,
  filtrosAnunciosVacios,
  idsExcluidos,
  idsNumericos,
  mapearFiltrosAParams,
  serializarParamsAnuncios,
  MAX_EXCLUIDOS,
  TAMANIO_LOTE,
  type AnuncioDTO,
  type FiltrosAnuncios,
} from './anuncios'

function anuncio(idAnuncio: number): AnuncioDTO {
  return {
    idAnuncio,
    contenido: '<p>Anuncio</p>',
    activo: true,
    fechaCreacion: '2026-11-25T10:00:00Z',
    personajeId: idAnuncio + 100,
    nombrePersonaje: `Personaje ${idAnuncio}`,
    avatarPersonaje: null,
    genero: null,
    raza: null,
    clase: null,
    edadPersonaje: null,
    online: true,
    usuarioId: 1,
    categorias: [],
  }
}

function filtros(parciales: Partial<FiltrosAnuncios> = {}): FiltrosAnuncios {
  return { ...filtrosAnunciosVacios(), ...parciales }
}

describe('anuncios (utilidades puras)', () => {
  describe('filtrosAnunciosVacios', () => {
    it('activa «solo conectados» por defecto', () => {
      expect(filtrosAnunciosVacios()).toEqual({
        nombre: '',
        genero: '',
        raza: '',
        clase: '',
        edadMin: null,
        edadMax: null,
        categoriaIds: [],
        soloOnline: true,
      })
    })
  })

  describe('idsNumericos', () => {
    it('acepta números y cadenas numéricas, sin duplicados ni valores inválidos', () => {
      expect(idsNumericos([1, '2', 2, ' 3 ', 0, -4, 'abc', null, undefined, '', true, 1.5])).toEqual([1, 2, 3])
    })

    it('devuelve una lista vacía si no recibe un array', () => {
      expect(idsNumericos(null)).toEqual([])
      expect(idsNumericos(undefined)).toEqual([])
      expect(idsNumericos('1,2' as unknown as number[])).toEqual([])
    })
  })

  describe('edadInvalida', () => {
    it('acepta edades enteras no negativas y excluye las demás', () => {
      expect(edadInvalida('')).toBe(false)
      expect(edadInvalida(null)).toBe(false)
      expect(edadInvalida(0)).toBe(false)
      expect(edadInvalida(' 18 ')).toBe(false)
      expect(edadInvalida(-1)).toBe(true)
      expect(edadInvalida(1.5)).toBe(true)
      expect(edadInvalida('abc')).toBe(true)
    })
  })

  describe('mapearFiltrosAParams', () => {
    it('omite los filtros vacíos y mantiene el tamaño del lote', () => {
      expect(mapearFiltrosAParams(filtros())).toEqual({
        size: TAMANIO_LOTE,
        soloOnline: true,
      })
    })

    it('recorta el texto, convierte la edad y envía las categorías como lista', () => {
      const params = mapearFiltrosAParams(
        filtros({
          nombre: '  Aelin  ',
          genero: 'Femenino',
          raza: 'Elfo',
          clase: 'Maga',
          edadMin: '18',
          edadMax: 120,
          categoriaIds: [3, '5' as unknown as number, 3],
          soloOnline: false,
        }),
      )

      expect(params).toEqual({
        size: TAMANIO_LOTE,
        nombre: 'Aelin',
        genero: 'Femenino',
        raza: 'Elfo',
        clase: 'Maga',
        edadMin: 18,
        edadMax: 120,
        categoriaIds: [3, 5],
      })
    })

    it('añade los ids ya vistos como lista segura y recortada', () => {
      const params = mapearFiltrosAParams(
        filtros(),
        [1, '2', 3.5, 'x', 1, ...Array.from({ length: 110 }, (_, i) => i + 10)],
      )

      expect(params.excluirIds).toHaveLength(MAX_EXCLUIDOS)
      expect(params.excluirIds).toEqual(
        expect.arrayContaining([1, 2]),
      )
      expect(Array.isArray(params.excluirIds)).toBe(true)
    })

    it('permite cambiar el tamaño del lote', () => {
      expect(mapearFiltrosAParams(filtros(), [], 9).size).toBe(9)
    })
  })

  describe('serializarParamsAnuncios', () => {
    it('repite la clave de las listas, sin los corchetes que añade Axios', () => {
      const params = mapearFiltrosAParams(
        filtros({ categoriaIds: [1, 2] }),
        [7, 8],
      )
      const query = serializarParamsAnuncios(params)

      expect(query).toContain('categoriaIds=1&categoriaIds=2')
      expect(query).toContain('excluirIds=7&excluirIds=8')
      expect(query).not.toContain('%5B%5D')
      expect(query).toContain('soloOnline=true')
      expect(query).toContain('size=9')
    })
  })

  describe('combinarLoteAnuncios', () => {
    it('concatena sin repetir y devuelve los ids acumulados', () => {
      const actuales = [anuncio(1), anuncio(2)]
      const resultado = combinarLoteAnuncios(actuales, [anuncio(2), anuncio(3)], true)

      expect(resultado.anuncios.map((a) => a.idAnuncio)).toEqual([1, 2, 3])
      expect(resultado.idsVistos).toEqual([1, 2, 3])
      expect(resultado.hayMas).toBe(true)
      expect(actuales.map((a) => a.idAnuncio)).toEqual([1, 2])
    })

    it('apaga «Ver más» cuando el lote no aporta anuncios nuevos', () => {
      const resultado = combinarLoteAnuncios([anuncio(1)], [anuncio(1)], true)
      expect(resultado.hayMas).toBe(false)
      expect(resultado.anuncios).toHaveLength(1)
    })

    it('respeta hayMas=false del backend', () => {
      const resultado = combinarLoteAnuncios([], [anuncio(7)], false)
      expect(resultado.hayMas).toBe(false)
      expect(idsExcluidos(resultado.anuncios)).toEqual([7])
    })
  })

  it('extrae texto plano del HTML del editor para validarlo', () => {
    expect(contenidoPlano('<p>   Hola <strong>mundo</strong>&nbsp;</p>')).toBe('Hola mundo')
    expect(contenidoPlano('<p><br></p>')).toBe('')
  })
})
