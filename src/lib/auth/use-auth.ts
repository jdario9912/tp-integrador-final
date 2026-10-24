import { useSyncExternalStore } from 'react'
import {
  clearSession,
  getSession,
  saveSession,
  subscribeSession,
} from './session-store'
import { toSession, type AuthResponse } from './types'

const signIn = (response: AuthResponse) => saveSession(toSession(response))

// solo local: el logout contra el backend (revocar el refresh token) lo hace useLogout (US-03)
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
