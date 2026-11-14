// todas las claves de fotos de un atleta cuelgan de este prefijo. El id del usuario va en la
// clave: si cambia la sesión no se muestran datos del anterior (mismo criterio que los pesos)
export const progressPhotosKey = (
  userId: string | undefined,
  athleteId: string,
) => ['progress-photos', userId, athleteId] as const

// listados (infinitos): se invalidan todos juntos con este prefijo
export const progressPhotoListsKey = (
  userId: string | undefined,
  athleteId: string,
) => [...progressPhotosKey(userId, athleteId), 'list'] as const

export const progressPhotoListKey = (
  userId: string | undefined,
  athleteId: string,
  size: number,
) => [...progressPhotoListsKey(userId, athleteId), size] as const
