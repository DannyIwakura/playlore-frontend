import { beforeEach, describe, expect, it } from 'vitest'
import router from '../router'
import { userStore } from '../store/userStore'
import api, { usaTokenDePersonaje } from './api'

const TOKEN_USUARIO = 'token-usuario'

function responder401(config: any) {
  const error: any = new Error('Request failed with status code 401')
  error.config = config
  error.response = { status: 401, config, data: { error: 'no autorizado' } }
  return Promise.reject(error)
}

async function pedirConBearer(bearer: string | null) {
  const headers: Record<string, string> = bearer ? { Authorization: `Bearer ${bearer}` } : {}

  await expect(
    api.get('/prueba-401', {
      headers,
      adapter: (config) => responder401(config),
    }),
  ).rejects.toThrow()
}

describe('usaTokenDePersonaje', () => {
  it('no lo considera de personaje cuando lleva el token del usuario', () => {
    expect(usaTokenDePersonaje('Bearer token-usuario', 'token-usuario')).toBe(false)
  })

  it('no lo considera de personaje cuando no hay cabecera', () => {
    expect(usaTokenDePersonaje(undefined, 'token-usuario')).toBe(false)
  })

  it('lo considera de personaje cuando lleva otro Bearer', () => {
    expect(usaTokenDePersonaje('Bearer token-personaje', 'token-usuario')).toBe(true)
  })

  it('no lo considera de personaje con esquemas que no son Bearer', () => {
    expect(usaTokenDePersonaje('Basic token-usuario', 'token-usuario')).toBe(false)
  })

  it('lo considera de personaje si ya no queda token de usuario', () => {
    expect(usaTokenDePersonaje('Bearer token-personaje', null)).toBe(true)
  })
})

describe('interceptor de 401', () => {
  beforeEach(async () => {
    localStorage.clear()
    userStore.setUsuario({ id: 7, username: 'lyra', role: 'USER', avatar: '' })
    // En /login el interceptor no navega, solo limpia.
    await router.push('/login')
  })

  it('cierra la sesion cuando el 401 viene del token del usuario', async () => {
    localStorage.setItem('token', TOKEN_USUARIO)

    await pedirConBearer(TOKEN_USUARIO)

    expect(localStorage.getItem('token')).toBeNull()
    expect(userStore.usuario.value).toBeNull()
  })

  it('cierra la sesion cuando la peticion no llevaba Authorization', async () => {
    localStorage.setItem('token', TOKEN_USUARIO)

    await pedirConBearer(null)

    expect(localStorage.getItem('token')).toBeNull()
    expect(userStore.usuario.value).toBeNull()
  })

  it('no cierra la sesion cuando el 401 viene de un token de personaje', async () => {
    localStorage.setItem('token', TOKEN_USUARIO)

    await pedirConBearer('token-de-sesion-de-personaje')

    expect(localStorage.getItem('token')).toBe(TOKEN_USUARIO)
    expect(userStore.usuario.value?.id).toBe(7)
  })

  it('no cierra la sesion en el login aunque devuelva 401', async () => {
    localStorage.setItem('token', TOKEN_USUARIO)

    await expect(
      api.post('/usuarios/login', { nombre: 'lyra' }, {
        adapter: (config) => responder401(config),
      }),
    ).rejects.toThrow()

    expect(localStorage.getItem('token')).toBe(TOKEN_USUARIO)
  })
})
