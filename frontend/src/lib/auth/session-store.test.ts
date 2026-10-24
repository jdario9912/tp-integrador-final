import { afterEach, describe, expect, it, vi } from 'vitest'
import { session } from '../../test/auth-fixtures'
import {
  clearSession,
  getSession,
  saveSession,
  SESSION_STORAGE_KEY,
  subscribeSession,
} from './session-store'

afterEach(() => {
  vi.restoreAllMocks()
  clearSession()
})

describe('session store', () => {
  it('sin nada guardado no hay sesión', () => {
    expect(getSession()).toBeNull()
  })

  it('guarda la sesión en localStorage y la devuelve', () => {
    saveSession(session())

    expect(getSession()).toEqual(session())
    expect(JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY)!)).toEqual(
      session(),
    )
  })

  it('devuelve el mismo objeto mientras la sesión no cambia', () => {
    saveSession(session())

    expect(getSession()).toBe(getSession())
  })

  it('clearSession borra la sesión guardada', () => {
    saveSession(session())

    clearSession()

    expect(getSession()).toBeNull()
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })

  it.each([
    ['un JSON corrupto', '{"accessToken": '],
    ['un objeto sin tokens', JSON.stringify({ user: session().user })],
    [
      'un rol desconocido',
      JSON.stringify({
        ...session(),
        user: { ...session().user, role: 'ADMIN' },
      }),
    ],
  ])('trata %s como sesión vacía', (_, raw) => {
    localStorage.setItem(SESSION_STORAGE_KEY, raw)

    expect(getSession()).toBeNull()
  })

  it('avisa a los suscriptores al guardar y al limpiar', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeSession(listener)

    saveSession(session())
    clearSession()
    unsubscribe()
    saveSession(session())

    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('avisa cuando la sesión cambia en otra pestaña', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeSession(listener)

    window.dispatchEvent(
      new StorageEvent('storage', { key: SESSION_STORAGE_KEY }),
    )
    window.dispatchEvent(new StorageEvent('storage', { key: 'otra-clave' }))
    unsubscribe()

    expect(listener).toHaveBeenCalledOnce()
  })

  it('si el navegador no deja escribir, la sesión sigue en memoria', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })

    expect(() => saveSession(session())).not.toThrow()
    expect(getSession()).toEqual(session())

    clearSession()
    expect(getSession()).toBeNull()
  })

  it('si el navegador no deja leer, no hay sesión', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })

    expect(getSession()).toBeNull()
  })
})
