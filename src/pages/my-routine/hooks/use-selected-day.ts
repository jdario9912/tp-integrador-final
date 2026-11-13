import { useState } from 'react'
import type { RoutineDay } from '../../../lib/routines'

// día abierto en el selector: arranca en el que le toca al atleta (nextDayId). Si el elegido deja
// de existir (el entrenador editó la rutina y se volvió a pedir), vuelve al que toca. null solo si
// la rutina no tiene días. Para volver a empezar al cambiar de asignación, montar con otra key
export const useSelectedDay = (
  days: RoutineDay[],
  nextDayId: string | null,
) => {
  const [chosenId, setChosenId] = useState<string | null>(null)

  const exists = (id: string | null) => days.some((day) => day.id === id)
  const fallbackId = exists(nextDayId) ? nextDayId : (days[0]?.id ?? null)
  const selectedId = exists(chosenId) ? chosenId : fallbackId

  return [selectedId, setChosenId] as const
}
