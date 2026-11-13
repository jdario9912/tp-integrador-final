// las sesiones de un atleta cuelgan de esta clave. No cuelga de sus asignaciones: una sesión en
// progreso sigue viva aunque el entrenador le reemplace la rutina (contrato de API, 10.1).
// El id del usuario va en la clave: si cambia la sesión de login no se muestran datos del anterior
export const athleteTrainingSessionsKey = (
  userId: string | undefined,
  athleteId: string,
) => ['training-sessions', userId, athleteId]

export const inProgressSessionKey = (
  userId: string | undefined,
  athleteId: string,
) => [...athleteTrainingSessionsKey(userId, athleteId), 'in-progress']

export const trainingSessionKey = (
  userId: string | undefined,
  athleteId: string,
  sessionId: string,
) => [...athleteTrainingSessionsKey(userId, athleteId), 'detail', sessionId]
