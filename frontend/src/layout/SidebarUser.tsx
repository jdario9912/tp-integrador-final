import { LogOut } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { useLogout } from '../lib/auth/use-logout'
import { Avatar } from '../ui/avatar'
import { IconButton } from '../ui/icon-button'

const ROLE_LABELS = {
  COACH: 'Entrenador',
  ATHLETE: 'Atleta',
} as const

export function SidebarUser() {
  const { user } = useAuth()
  const { mutate: logout, isPending } = useLogout()

  if (!user) return null

  return (
    <div
      aria-label="Sesión"
      role="group"
      className="border-border-subtle flex items-center gap-3 border-t pt-4"
    >
      <Avatar firstName={user.firstName} lastName={user.lastName} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-semibold">
          {user.firstName} {user.lastName}
        </span>
        <span className="text-muted-foreground text-xs">
          {ROLE_LABELS[user.role]}
        </span>
      </div>
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
