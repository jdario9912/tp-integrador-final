import { isApiError } from '../../lib/api'
import { useAthlete } from '../../lib/athletes'
import { useNavigate, useParams } from '../../lib/navigation'
import { athleteEditPath, paths } from '../../router/paths'
import { OutlineButton } from '../../ui/button'
import { Callout } from '../../ui/callout'
import { ArrowLeft, RotateCw } from '../../ui/icons'
import { TextLink } from '../../ui/text-link'
import { ActiveRoutineSection } from './components/ActiveRoutineSection'
import { AthleteProfileHeader } from './components/AthleteProfileHeader'
import { AthleteProfileSkeleton } from './components/AthleteProfileSkeleton'
import {
  AthleteUnavailable,
  type UnavailableReason,
} from './components/AthleteUnavailable'
import { HealthTrainingSection } from './components/HealthTrainingSection'
import { LatestWeightSection } from './components/LatestWeightSection'
import { PersonalDataSection } from './components/PersonalDataSection'
import { ProfileColumns } from './components/ProfileColumns'
import { RecentSessionsSection } from './components/RecentSessionsSection'
import { usePrefetchLatestWeight } from './hooks/use-latest-weight'

// 404: no existe o se eliminó. 400: el id de la URL no es un UUID, para el usuario es lo mismo.
// 403: de otro entrenador o desvinculado. Ninguno cambia al reintentar
const unavailableReason = (error: Error): UnavailableReason | undefined => {
  if (!isApiError(error)) return undefined
  if (error.status === 403) return 'forbidden'
  if (error.status === 400 || error.status === 404) return 'not-found'
  return undefined
}

const errorMessage = (error: Error) =>
  isApiError(error)
    ? error.message
    : 'Ocurrió un error inesperado. Intentá nuevamente.'

export function AthleteProfilePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const {
    data: athlete,
    error,
    isPending,
    isFetching,
    refetch,
  } = useAthlete(id)
  // en paralelo con el atleta: la sección "Último peso" lo toma de la caché
  usePrefetchLatestWeight(id)

  const reason = error ? unavailableReason(error) : undefined
  if (reason) return <AthleteUnavailable reason={reason} />

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
      <div className="flex flex-col gap-6">
        {backLink}
        <div className="flex flex-col items-start gap-3">
          <Callout tone="danger" className="self-stretch">
            {errorMessage(error)}
          </Callout>
          <OutlineButton
            size="sm"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            <RotateCw aria-hidden="true" />
            {isFetching ? 'Reintentando…' : 'Reintentar'}
          </OutlineButton>
        </div>
      </div>
    )
  }

  if (isPending) {
    return (
      <div className="flex flex-col gap-6">
        {backLink}
        <AthleteProfileSkeleton />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {backLink}
      <AthleteProfileHeader
        athlete={athlete}
        onEdit={() => navigate(athleteEditPath(athlete.id))}
      />
      <ProfileColumns
        main={
          <>
            <PersonalDataSection athlete={athlete} />
            <HealthTrainingSection athlete={athlete} />
          </>
        }
        aside={
          <>
            <LatestWeightSection
              athleteId={athlete.id}
              initialWeightKg={athlete.initialWeightKg}
            />
            <ActiveRoutineSection />
            <RecentSessionsSection />
          </>
        }
      />
    </div>
  )
}
