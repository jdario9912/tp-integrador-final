import { useAuth } from '../lib/auth'
import { useLogout } from '../lib/auth/use-logout'
import { NavLink } from '../lib/navigation'
import { currentPhotoUrl, useOwnProfile } from '../lib/profile' // US-48
import { paths } from '../router/paths' // US-48
import { Avatar } from '../ui/avatar'
import { IconButton } from '../ui/icon-button'
import { LogOut } from '../ui/icons'

const ROLE_LABELS = {
  COACH: 'Entrenador',
  ATHLETE: 'Atleta',
} as const

// US-48: onNavigate cierra el panel en móvil al ir a Mi perfil (lo pasa Sidebar)
type SidebarUserProps = {
  onNavigate?: () => void
}

export function SidebarUser({ onNavigate }: SidebarUserProps) {
  const { user } = useAuth()
  const { mutate: logout, isPending } = useLogout()
  // US-48: foto de perfil del avatar; sin foto (o vencida mientras se renueva), las iniciales
  const { data: profile } = useOwnProfile()

  if (!user) return null

  return (
    <div
      aria-label="Sesión"
      role="group"
      className="border-border-subtle flex items-center gap-3 border-t pt-4"
    >
      {/* US-48: el bloque de la cuenta lleva a Mi perfil */}
      <NavLink
        to={paths.profile}
        onClick={onNavigate}
        aria-label={`Mi perfil, ${user.firstName} ${user.lastName}`}
        className="focus-visible:ring-ring rounded-control hover:bg-primary-soft -m-1 flex min-w-0 flex-1 items-center gap-3 p-1 transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <Avatar
          firstName={user.firstName}
          lastName={user.lastName}
          src={currentPhotoUrl(profile) ?? undefined}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-semibold">
            {user.firstName} {user.lastName}
          </span>
          <span className="text-muted-foreground text-xs">
            {ROLE_LABELS[user.role]}
          </span>
        </div>
      </NavLink>
      <IconButton
        aria-label="Cerrar sesión"
        onClick={() => logout()}
        disabled={isPending}
        className="hover:text-primary"
      >
        <LogOut />
      </IconButton>
    </div>
  )
}
