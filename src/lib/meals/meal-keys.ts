// las comidas de un atleta cuelgan de esta clave: las mutaciones la invalidan y así se refresca
// el día. El id del usuario va en la clave: si cambia la sesión no se muestran datos del anterior
export const athleteMealsKey = (
  userId: string | undefined,
  athleteId: string,
) => ['meals', userId, athleteId]

// comidas de un día (GET con ?date=)
export const mealsOfDayKey = (
  userId: string | undefined,
  athleteId: string,
  date: string,
) => [...athleteMealsKey(userId, athleteId), 'day', date]
