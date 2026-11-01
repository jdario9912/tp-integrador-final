import { ArrowLeft, SearchX, UserX } from 'lucide-react'
import { paths } from '../../../router/paths'
import { EmptyState } from '../../../ui/empty-state'
import { TextLink } from '../../../ui/text-link'

export type UnavailableReason = 'not-found' | 'forbidden'

// el 403 no distingue "desvinculado" de "de otro entrenador" (D-014): un solo aviso para los dos
const copy: Record<UnavailableReason, { title: string; description: string }> =
  {
    'not-found': {
      title: 'El atleta no existe',
      description:
        'Puede que se haya eliminado o que el enlace no sea correcto.',
    },
    forbidden: {
      title: 'Este atleta no está en tu cartera',
      description:
        'Puede que lo hayas desvinculado o que pertenezca a otro entrenador.',
    },
  }

type AthleteUnavailableProps = { reason: UnavailableReason }

// no hay nada que reintentar: solo la salida al listado
export function AthleteUnavailable({ reason }: AthleteUnavailableProps) {
  const { title, description } = copy[reason]

  return (
    <EmptyState
      icon={reason === 'forbidden' ? <UserX /> : <SearchX />}
      title={title}
      description={description}
      action={
        <TextLink to={paths.athletes}>
          <ArrowLeft aria-hidden="true" /> Volver a atletas
        </TextLink>
      }
    />
  )
}
