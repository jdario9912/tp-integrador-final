import type { UnavailableReason } from '../../../components/routine-unavailable'
import { EmptyState } from '../../../ui/empty-state'
import { Lock, UserX } from '../../../ui/icons'

// textos propios: los mensajes del backend hablan de "este atleta" y traen ids
const copy: Record<UnavailableReason, { title: string; description: string }> =
  {
    // CE-3: no es su rutina (no debería pasar con su propio id)
    forbidden: {
      title: 'No podés ver esta rutina',
      description: 'Si creés que es un error, hablá con tu entrenador.',
    },
    // 404/400: la cuenta se eliminó con la sesión todavía abierta
    'not-found': {
      title: 'No encontramos tu cuenta',
      description:
        'Volvé a iniciar sesión. Si sigue pasando, hablá con tu entrenador.',
    },
  }

type MyRoutineUnavailableProps = { reason: UnavailableReason }

// no cambia al reintentar: sin botón de Reintentar
export function MyRoutineUnavailable({ reason }: MyRoutineUnavailableProps) {
  const { title, description } = copy[reason]

  return (
    <EmptyState
      icon={reason === 'forbidden' ? <Lock /> : <UserX />}
      title={title}
      description={description}
    />
  )
}
