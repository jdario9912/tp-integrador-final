import { ArrowLeft, RotateCw, UserX } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AthleteForm,
  coachEditFields,
  toAthleteFormValues,
  type AthleteFormValues,
} from '../../components/athlete-form'
import { PageHeader } from '../../layout'
import { isApiError } from '../../lib/api'
import { paths } from '../../router/paths'
import { OutlineButton } from '../../ui/button'
import { Callout } from '../../ui/callout'
import { EmptyState } from '../../ui/empty-state'
import { Skeleton } from '../../ui/skeleton'
import { TextLink } from '../../ui/text-link'
import { AthleteAccountCard } from './components/AthleteAccountCard'
import { useAthlete } from './hooks/use-athlete'
import { useSetAthleteActive } from './hooks/use-set-athlete-active'
import { useUnlinkAthlete } from './hooks/use-unlink-athlete'
import { useUpdateAthlete } from './hooks/use-update-athlete'
import { toUpdateAthleteInput } from './to-update-athlete-input'

// 404 (no existe) y 403 (es de otro entrenador): no hay nada que reintentar
const isUnavailable = (error: Error) =>
  isApiError(error) && (error.status === 403 || error.status === 404)

const errorMessage = (error: Error) =>
  isApiError(error)
    ? error.message
    : 'Ocurrió un error inesperado. Intentá nuevamente.'

export function EditAthletePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { data: athlete, error, isPending, refetch } = useAthlete(id)
  const updateAthlete = useUpdateAthlete(id)
  const setActive = useSetAthleteActive(id)
  const unlink = useUnlinkAthlete(id)

  const backLink = (
    <TextLink
      to={paths.athletes}
      className="text-muted-foreground hover:text-primary self-start"
    >
      <ArrowLeft aria-hidden="true" /> Volver a atletas
    </TextLink>
  )

  if (error) {
    return (
      <div className="flex max-w-265 flex-col gap-6">
        {backLink}
        {isUnavailable(error) ? (
          <EmptyState
            icon={<UserX />}
            title="No encontramos este atleta"
            description={error.message}
          />
        ) : (
          <div className="flex flex-col items-start gap-3">
            <Callout tone="danger" className="self-stretch">
              {errorMessage(error)}
            </Callout>
            <OutlineButton size="sm" onClick={() => void refetch()}>
              <RotateCw aria-hidden="true" /> Reintentar
            </OutlineButton>
          </div>
        )}
      </div>
    )
  }

  if (isPending) {
    return (
      <div
        role="status"
        aria-label="Cargando atleta"
        className="flex max-w-265 flex-col gap-6"
      >
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  const athleteName = `${athlete.firstName} ${athlete.lastName}`

  // vuelve al listado con el aviso; el nombre es el guardado, por si se editó
  const handleSave = async (values: AthleteFormValues) => {
    const saved = await updateAthlete.mutateAsync(toUpdateAthleteInput(values))
    navigate(paths.athletes, {
      state: {
        notice: `Guardaste los cambios de ${saved.firstName} ${saved.lastName}.`,
      },
    })
  }

  // un solo aviso para las dos acciones de la cuenta: al empezar una se descarta el error de la otra
  const toggleActive = () => {
    unlink.reset()
    return setActive.mutateAsync(!athlete.active)
  }

  const handleUnlink = async () => {
    setActive.reset()
    await unlink.mutateAsync()
    navigate(paths.athletes, {
      state: {
        notice: `Desvinculaste a ${athleteName}.`,
      },
    })
  }

  const accountError = setActive.error ?? unlink.error

  return (
    <div className="flex max-w-265 flex-col gap-6">
      {backLink}
      <PageHeader
        title={`Editar a ${athleteName}`}
        description="Actualizá sus datos o gestioná su cuenta."
      />
      <AthleteForm
        // al cambiar de atleta el formulario se vuelve a montar con sus datos
        key={athlete.id}
        idPrefix="edit-athlete"
        defaultValues={toAthleteFormValues(athlete)}
        fields={coachEditFields}
        onSubmit={handleSave}
        onCancel={() => navigate(paths.athletes)}
        submitLabel="Guardar cambios"
      />
      {accountError && (
        <Callout tone="danger">{errorMessage(accountError)}</Callout>
      )}
      <AthleteAccountCard
        athleteName={athleteName}
        active={athlete.active}
        onToggleActive={toggleActive}
        onUnlink={handleUnlink}
        isTogglingActive={setActive.isPending}
        isUnlinking={unlink.isPending}
      />
    </div>
  )
}
