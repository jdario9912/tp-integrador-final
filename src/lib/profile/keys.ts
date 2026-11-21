// el perfil cuelga del id del usuario: si cambia la sesión no se muestran datos del anterior
export const ownProfileKey = (userId: string | undefined) =>
  ['own-profile', userId] as const
