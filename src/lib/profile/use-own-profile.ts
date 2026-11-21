import { useQuery, type QueryObserverResult } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { useAuth } from '../auth'
import { getOwnProfile } from './get-own-profile'
import { ownProfileKey } from './keys'
import { renewalDelayMs } from './photo-renewal'
import type { OwnProfile } from './types'

// máximo que admite setTimeout (unos 24 días): más que eso dispararía de inmediato por desborde
const MAX_TIMER_MS = 2_147_483_647

// ref y no estado: una URL ya vencida se pide de nuevo una sola vez (si la nueva también venció
// no se reintenta en bucle)
const useRenewPhotoUrl = (
  profile: OwnProfile | undefined,
  refetch: () => Promise<QueryObserverResult<OwnProfile>>,
) => {
  const expiresAt = profile?.photoUrl ? profile.photoUrlExpiresAt : null
  const renewedFor = useRef<string | null>(null)

  useEffect(() => {
    if (!expiresAt) return
    const delay = renewalDelayMs(expiresAt)
    if (delay > 0) {
      const timer = setTimeout(
        () => void refetch(),
        Math.min(delay, MAX_TIMER_MS),
      )
      return () => clearTimeout(timer)
    }
    if (renewedFor.current === expiresAt) return
    renewedFor.current = expiresAt
    void refetch()
  }, [expiresAt, refetch])
}

// el perfil propio (avatar del menú y página Mi perfil). Con foto, la URL firmada se renueva
// pidiendo el perfil otra vez justo antes de que venza
export const useOwnProfile = () => {
  const { user } = useAuth()
  const query = useQuery({
    queryKey: ownProfileKey(user?.id),
    queryFn: getOwnProfile,
    enabled: user !== null,
  })
  useRenewPhotoUrl(query.data, query.refetch)
  return query
}
