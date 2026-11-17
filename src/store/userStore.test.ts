import { beforeEach, describe, expect, it } from 'vitest'
import { userStore } from './userStore'

const b64url = (valor: object) =>
  btoa(JSON.stringify(valor)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

const token = (payload: object) =>
  `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.firma`

const TOKEN_VALIDO = token({ id: 7, sub: 'lyra', role: 'USER', avatar: '/uploads/lyra.png' })

describe('hidratarDesdeToken', () => {
  beforeEach(() => {
    localStorage.clear()
    userStore.setUsuario(null)
  })

  it('rellena el usuario desde el token', () => {
    localStorage.setItem('token', TOKEN_VALIDO)

    expect(userStore.hidratarDesdeToken()).toBe(7)
    expect(userStore.usuario.value).toEqual({
      id: 7,
      username: 'lyra',
      role: 'USER',
      avatar: '/uploads/lyra.png',
    })
  })

  it('sin token devuelve null y vacia el usuario', () => {
    userStore.setUsuario({ id: 9, username: 'otro', role: 'USER', avatar: '' })

    expect(userStore.hidratarDesdeToken()).toBeNull()
    expect(userStore.usuario.value).toBeNull()
  })

  it('un token sin id no identifica al usuario', () => {
    localStorage.setItem('token', token({ sub: 'lyra', role: 'USER' }))

    expect(userStore.hidratarDesdeToken()).toBeNull()
    expect(userStore.usuario.value).toBeNull()
  })

  it('un token ilegible no rompe y deja el usuario a null', () => {
    localStorage.setItem('token', 'no-es-un-jwt')

    expect(userStore.hidratarDesdeToken()).toBeNull()
    expect(userStore.usuario.value).toBeNull()
  })

  it('no pisa los datos ya enriquecidos para el mismo usuario', () => {
    userStore.setUsuario({ id: 7, username: 'nombre de la BD', role: 'ADMIN', avatar: '/nuevo.png' })
    localStorage.setItem('token', TOKEN_VALIDO)

    expect(userStore.hidratarDesdeToken()).toBe(7)
    expect(userStore.usuario.value).toEqual({
      id: 7,
      username: 'nombre de la BD',
      role: 'ADMIN',
      avatar: '/nuevo.png',
    })
  })

  it('cambia el usuario si el token es de otra cuenta', () => {
    userStore.setUsuario({ id: 9, username: 'otro', role: 'USER', avatar: '' })
    localStorage.setItem('token', TOKEN_VALIDO)

    expect(userStore.hidratarDesdeToken()).toBe(7)
    expect(userStore.usuario.value?.username).toBe('lyra')
  })
})
