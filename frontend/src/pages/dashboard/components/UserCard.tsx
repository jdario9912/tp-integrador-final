import { useAuth } from '../../../lib/auth'
import { useLogout } from '../../../lib/auth/use-logout'
import { SecondaryButton } from '../../../ui/button'

const ROLE_LABELS = {
  COACH: 'Entrenador',
  ATHLETE: 'Atleta',
} as const

const initialsOf = (firstName: string, lastName: string) =>
  `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()

export function UserCard() {
  const { user } = useAuth()
  const { mutate: logout, isPending } = useLogout()

  if (!user) return null

  return (
    <aside
      aria-label="Sesión"
      className="border-border bg-background flex flex-wrap items-center gap-3 rounded-xl border p-3"
    >
      <div
        aria-hidden="true"
        className="bg-secondary text-secondary-foreground flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
      >
        {initialsOf(user.firstName, user.lastName)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {user.firstName} {user.lastName}
        </p>
        <p className="text-muted-foreground text-xs">
          {ROLE_LABELS[user.role]}
        </p>
      </div>
      <SecondaryButton onClick={() => logout()} disabled={isPending}>
        Cerrar sesión
      </SecondaryButton>
    </aside>
  )
}
