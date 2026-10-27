import { ChevronRight, Menu } from 'lucide-react'
import { useMatches } from 'react-router-dom'
import { IconButton } from '../ui/icon-button'
import { Brand } from './Brand'

// cada ruta declara su título en `handle`: { handle: { title: 'Panel' } }
type RouteHandle = { title?: string }

type TopbarProps = {
  sidebarId: string
  sidebarOpen: boolean
  onOpenSidebar: () => void
}

export function Topbar({ sidebarId, sidebarOpen, onOpenSidebar }: TopbarProps) {
  const crumbs = useMatches()
    .map((match) => (match.handle as RouteHandle | undefined)?.title)
    .filter((title): title is string => Boolean(title))

  return (
    <header className="border-border-subtle bg-background/90 sticky top-0 z-20 flex h-16 items-center gap-3 border-b px-4 backdrop-blur-sm sm:px-8 lg:h-18">
      <IconButton
        aria-label="Abrir menú"
        aria-controls={sidebarId}
        aria-expanded={sidebarOpen}
        onClick={onOpenSidebar}
        className="lg:hidden"
      >
        <Menu />
      </IconButton>
      <Brand compact className="lg:hidden" />
      {crumbs.length > 0 && (
        <nav aria-label="Ubicación" className="max-lg:hidden">
          <ol className="text-muted-foreground flex items-center gap-2 text-sm">
            {crumbs.map((title, index) => {
              const isLast = index === crumbs.length - 1
              return (
                <li key={title} className="flex items-center gap-2">
                  {index > 0 && (
                    <ChevronRight
                      aria-hidden="true"
                      className="text-border size-4.5"
                    />
                  )}
                  <span
                    aria-current={isLast ? 'page' : undefined}
                    className={isLast ? 'text-foreground font-semibold' : ''}
                  >
                    {title}
                  </span>
                </li>
              )
            })}
          </ol>
        </nav>
      )}
    </header>
  )
}
