import { athleteMealsKey } from '../../lib/meals'

// el resumen cuelga de la clave de las comidas del atleta: las mutaciones de lib/meals invalidan
// ese prefijo, así que el resumen del día se vuelve a pedir junto con la lista
export const dailySummaryKey = (
  userId: string | undefined,
  athleteId: string,
  date: string,
) => [...athleteMealsKey(userId, athleteId), 'summary', date]
