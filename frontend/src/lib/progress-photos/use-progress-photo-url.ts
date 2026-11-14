import { useCallback, useEffect, useRef, useState } from 'react'
import { getProgressPhoto } from './get-progress-photos'
import type { ProgressPhoto } from './types'
import { isUrlExpired } from './url-expiry'

export type ProgressPhotoUrlState =
  | { status: 'ready'; url: string }
  | { status: 'renewing' }
  | { status: 'failed' }

// URL de una foto que puede venir vencida. Se pide la foto de nuevo como mucho UNA vez, cuando
// urlExpiresAt ya pasó (con margen) o cuando la imagen falla. Si la nueva también falla, queda
// en error: no se reintenta en bucle
export function useProgressPhotoUrl(athleteId: string, photo: ProgressPhoto) {
  const [fresh, setFresh] = useState<ProgressPhoto | null>(null)
  const [phase, setPhase] = useState<
    'idle' | 'renewing' | 'renewed' | 'failed'
  >('idle')
  // ref y no estado: la regla de "una sola vez" no depende del render
  const requested = useRef(false)

  const requestRenewal = useCallback(() => {
    if (requested.current) return
    requested.current = true
    setPhase('renewing')
    getProgressPhoto(athleteId, photo.id).then(
      (renewed) => {
        setFresh(renewed)
        setPhase('renewed')
      },
      () => setPhase('failed'),
    )
  }, [athleteId, photo.id])

  const expired = isUrlExpired(photo.urlExpiresAt)

  useEffect(() => {
    if (expired) requestRenewal()
  }, [expired, requestRenewal])

  const onImageError = useCallback(() => {
    // la URL nueva también falló: se muestra el error, no se pide otra
    if (requested.current) setPhase('failed')
    else requestRenewal()
  }, [requestRenewal])

  const state: ProgressPhotoUrlState = (() => {
    if (phase === 'failed') return { status: 'failed' }
    if (phase === 'renewing' || (phase === 'idle' && expired))
      return { status: 'renewing' }
    if (phase === 'renewed' && fresh) return { status: 'ready', url: fresh.url }
    return { status: 'ready', url: photo.url }
  })()

  return { state, onImageError }
}
