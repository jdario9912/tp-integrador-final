import { NavLink } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { cn } from '../lib/cn'
import { Brand } from './Brand'
import { navItems } from './nav-items'
import { SidebarUser } from './SidebarUser'

type SidebarProps = {
  id: string
  // en móvil el sidebar es un panel que se abre desde la barra superior
  open: boolean
  onNavigate: () => void
}

export function Sidebar({ id, open, onNavigate }: SidebarProps) {
  const { user } = useAuth()
  const items = user ? navItems[user.role] : []

  return (
    <aside
      id={id}
      className={cn(
        'border-border-subtle bg-background fixed inset-y-0 left-0 z-40 flex w-66 flex-col border-r px-4 py-6 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
        // cerrado en móvil queda fuera de pantalla y fuera del orden de foco
        !open && 'max-lg:invisible max-lg:-translate-x-full',
      )}
    >
      <Brand className="mb-7 px-2" />
      <nav aria-label="Principal" className="flex flex-col gap-1">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'focus-visible:ring-ring flex items-center gap-3 rounded-control px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none',
                isActive
                  ? 'bg-primary-soft-strong text-primary font-bold'
                  : 'text-muted-foreground hover:bg-primary-soft hover:text-foreground',
              )
            }
          >
            <Icon aria-hidden="true" className="size-5.5" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto">
        <SidebarUser />
      </div>
    </aside>
  )
}
