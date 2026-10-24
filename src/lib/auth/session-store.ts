import type { Role, Session } from './types'

// sesión persistida en localStorage. Los componentes la leen con useSyncExternalStore
// (ver use-auth) y los interceptores de axios la actualizan al refrescar o al expirar
export const SESSION_STORAGE_KEY = 'tpif.session'

type Listener = () => void

const listeners = new Set<Listener>()

// cache por el texto guardado: getSession devuelve el mismo objeto mientras no cambie,
// como exige useSyncExternalStore
let cachedRaw: string | null = null
let cachedSession: Session | null = null

// solo se usa si el navegador no deja escribir en localStorage (modo privado, cuota llena):
// la sesión funciona pero no sobrevive a una recarga
let memoryFallback: Session | null = null

const ROLES: readonly string[] = ['COACH', 'ATHLETE'] satisfies Role[]

const isFilledString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0

const isSession = (value: unknown): value is Session => {
  if (typeof value !== 'object' || value === null) return false
  const { accessToken, refreshToken, user } = value as Record<string, unknown>
  if (!isFilledString(accessToken) || !isFilledString(refreshToken))
    return false
  if (typeof user !== 'object' || user === null) return false
  const { id, email, role } = user as Record<string, unknown>
  return (
    isFilledString(id) &&
    isFilledString(email) &&
    typeof role === 'string' &&
    ROLES.includes(role)
  )
}

const readRaw = () => {
  try {
    return localStorage.getItem(SESSION_STORAGE_KEY)
  } catch {
    return null
  }
}

// un valor corrupto o con otra forma (ej. de una versión vieja) se trata como sin sesión
const parse = (raw: string | null): Session | null => {
  if (raw === null) return null
  try {
    const value: unknown = JSON.parse(raw)
    return isSession(value) ? value : null
  } catch {
    return null
  }
}

const notify = () => listeners.forEach((listener) => listener())

export const getSession = (): Session | null => {
  const raw = readRaw()
  if (raw === null && memoryFallback) return memoryFallback
  if (raw !== cachedRaw) {
    cachedRaw = raw
    cachedSession = parse(raw)
  }
  return cachedSession
}

export const saveSession = (session: Session) => {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
    memoryFallback = null
  } catch {
    memoryFallback = session
  }
  notify()
}

export const clearSession = () => {
  memoryFallback = null
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY)
  } catch {
    // nada que limpiar si el storage no está disponible
  }
  notify()
}

export const subscribeSession = (listener: Listener) => {
  listeners.add(listener)
  // login o logout en otra pestaña del mismo navegador
  const onStorage = (event: StorageEvent) => {
    if (event.key === SESSION_STORAGE_KEY || event.key === null) listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}
