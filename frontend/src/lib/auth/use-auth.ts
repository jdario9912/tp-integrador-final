import { useSyncExternalStore } from 'react'
import {
  clearSession,
  getSession,
  saveSession,
  subscribeSession,
} from './session-store'
import { toSession, type AuthResponse } from './types'

const signIn = (response: AuthResponse) => saveSession(toSession(response))

// solo local: el cierre de sesión contra el backend (revocar el refresh token) es la US-03
const signOut = () => clearSession()

export function useAuth() {
  const session = useSyncExternalStore(subscribeSession, getSession, getSession)
  return {
    session,
    user: session?.user ?? null,
    isAuthenticated: session !== null,
    signIn,
    signOut,
  }
}
