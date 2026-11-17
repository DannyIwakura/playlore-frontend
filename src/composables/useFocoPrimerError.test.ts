import { afterEach, describe, expect, it } from 'vitest'
import { enfocarPrimerError } from './useFocoPrimerError'

function montarFormulario(html: string): HTMLFormElement {
  const form = document.createElement('form')
  form.innerHTML = html
  document.body.append(form)
  return form
}

describe('enfocarPrimerError', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('enfoca el primer campo con aria-invalid="true"', async () => {
    const form = montarFormulario(`
      <input id="nombre" aria-invalid="false" />
      <input id="email" aria-invalid="true" />
      <input id="password" aria-invalid="true" />
    `)

    await enfocarPrimerError(form)

    expect(document.activeElement).toBe(form.querySelector('#email'))
  })

  it('no mueve el foco si ningún campo está marcado', async () => {
    const form = montarFormulario(`
      <input id="nombre" aria-invalid="false" />
      <input id="email" />
    `)
    const antes = document.activeElement

    await enfocarPrimerError(form)

    expect(document.activeElement).toBe(antes)
  })

  it('no falla sin contenedor', async () => {
    await expect(enfocarPrimerError(null)).resolves.toBeUndefined()
    await expect(enfocarPrimerError(undefined)).resolves.toBeUndefined()
  })

  it('espera al siguiente tick para que el DOM tenga los campos nuevos', async () => {
    const form = montarFormulario('<div id="hueco"></div>')
    const promesa = enfocarPrimerError(form)

    const input = document.createElement('input')
    input.id = 'tarde'
    input.setAttribute('aria-invalid', 'true')
    form.querySelector('#hueco')!.replaceWith(input)

    await promesa

    expect(document.activeElement).toBe(input)
  })
})
