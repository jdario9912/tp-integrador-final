import { paths } from '../../../router/paths'
import { EmptyState } from '../../../ui/empty-state'
import { ArrowLeft, Lock, SearchX } from '../../../ui/icons'
import { TextLink } from '../../../ui/text-link'

export type UnavailableReason = 'not-found' | 'forbidden'

// textos propios: el 404 del backend trae el id de la URL, que no le dice nada al usuario
const copy: Record<UnavailableReason, { title: string; description: string }> =
  {
    'not-found': {
      title: 'La rutina no existe',
      description: 'Puede que el enlace no sea correcto.',
    },
    forbidden: {
      title: 'No tenés acceso a esta rutina',
      description: 'Pertenece a otro entrenador.',
    },
  }

type RoutineUnavailableProps = { reason: UnavailableReason }

// no hay nada que reintentar: solo la salida al listado
export function RoutineUnavailable({ reason }: RoutineUnavailableProps) {
  const { title, description } = copy[reason]

  return (
    <EmptyState
      icon={reason === 'forbidden' ? <Lock /> : <SearchX />}
      title={title}
      description={description}
      action={
        <TextLink to={paths.routines}>
          <ArrowLeft aria-hidden="true" /> Volver a rutinas
        </TextLink>
      }
    />
  )
}
