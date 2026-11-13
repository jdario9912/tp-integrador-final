import type { UnavailableReason } from '../../../components/routine-unavailable'
import { EmptyState } from '../../../ui/empty-state'
import { Lock, SearchX } from '../../../ui/icons'

// textos propios: el 404 del backend trae el id de la URL, que no le dice nada al atleta
const copy: Record<UnavailableReason, { title: string; description: string }> =
  {
    // 404 (no existe o es de otro atleta) o 400 (el id de la URL no es válido)
    'not-found': {
      title: 'No encontramos este entrenamiento',
      description:
        'Puede que el enlace no sea correcto. Si tenés uno en curso, lo retomás desde Mi rutina.',
    },
    // no debería pasar con su propio id
    forbidden: {
      title: 'No podés ver este entrenamiento',
      description: 'Si creés que es un error, hablá con tu entrenador.',
    },
  }

type TrainingSessionUnavailableProps = { reason: UnavailableReason }

// no cambia al reintentar: sin botón de Reintentar (la salida a Mi rutina está arriba)
export function TrainingSessionUnavailable({
  reason,
}: TrainingSessionUnavailableProps) {
  const { title, description } = copy[reason]

  return (
    <EmptyState
      icon={reason === 'forbidden' ? <Lock /> : <SearchX />}
      title={title}
      description={description}
    />
  )
}
