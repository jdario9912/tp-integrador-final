import { EmptyState } from '../../../ui/empty-state'
import { ClipboardList } from '../../../ui/icons'

// CE-1: el backend respondió 204 (sin rutina activa); el texto lo pone el frontend
export function NoRoutine() {
  return (
    <EmptyState
      icon={<ClipboardList />}
      title="Tu entrenador aún no te asignó una rutina"
      description="Cuando te asigne una, vas a ver acá qué te toca entrenar cada día."
    />
  )
}
