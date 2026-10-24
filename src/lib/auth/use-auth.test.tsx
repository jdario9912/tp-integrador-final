import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { authResponse } from '../../test/auth-fixtures'
import { clearSession } from './session-store'
import { useAuth } from './use-auth'

describe('useAuth', () => {
  it('arranca sin sesión', () => {
    const { result } = renderHook(() => useAuth())

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it('signIn guarda la sesión con el usuario y su rol', () => {
    const { result } = renderHook(() => useAuth())

    act(() => result.current.signIn(authResponse('ATHLETE')))

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user).toMatchObject({
      firstName: 'Leo',
      role: 'ATHLETE',
    })
    expect(result.current.session?.accessToken).toBe('access-1')
  })

  it('signOut cierra la sesión local', () => {
    const { result } = renderHook(() => useAuth())
    act(() => result.current.signIn(authResponse()))

    act(() => result.current.signOut())

    expect(result.current.isAuthenticated).toBe(false)
  })

  // así se entera la UI cuando el interceptor descarta una sesión vencida
  it('se actualiza si la sesión se limpia desde afuera de React', () => {
    const { result } = renderHook(() => useAuth())
    act(() => result.current.signIn(authResponse()))

    act(() => clearSession())

    expect(result.current.isAuthenticated).toBe(false)
  })
})
