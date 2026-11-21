import { PageHeader } from '../../layout'
import { useOwnProfile } from '../../lib/profile'
import { Callout } from '../../ui/callout'
import { GhostButton } from '../../ui/button'
import { RotateCw } from '../../ui/icons'
import { Skeleton } from '../../ui/skeleton'
import { ChangePasswordSection } from './components/ChangePasswordSection'
import { PersonalDataSection } from './components/PersonalDataSection'
import { ProfilePhotoSection } from './components/ProfilePhotoSection'
import { PROFILE_LOAD_ERROR } from './messages'

// US-48: Mi perfil, igual para los dos roles. Foto (con sus acciones) a la izquierda en escritorio;
// datos y contraseña a la derecha. En móvil, una columna: foto, datos y contraseña
export function ProfilePage() {
  const {
    data: profile,
    isPending,
    isError,
    isFetching,
    refetch,
  } = useOwnProfile()

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Mi perfil"
        description="Tus datos, tu foto y tu contraseña."
      />

      {isPending && (
        <div
          role="status"
          aria-label="Cargando tu perfil"
          className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]"
        >
          <Skeleton className="h-96 w-full rounded-card" />
          <Skeleton className="h-96 w-full rounded-card" />
        </div>
      )}

      {isError && (
        <Callout tone="danger" className="flex flex-wrap items-center gap-3">
          <span>{PROFILE_LOAD_ERROR}</span>
          <GhostButton
            size="sm"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            <RotateCw aria-hidden="true" />
            {isFetching ? 'Reintentando...' : 'Reintentar'}
          </GhostButton>
        </Callout>
      )}

      {profile && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-start">
          <ProfilePhotoSection profile={profile} />
          <div className="flex min-w-0 flex-col gap-6">
            <PersonalDataSection profile={profile} />
            <ChangePasswordSection />
          </div>
        </div>
      )}
    </div>
  )
}
