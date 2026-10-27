import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

const SIDEBAR_ID = 'app-sidebar'

// layout de las páginas con sesión: sidebar fijo en escritorio, panel desplegable en móvil
export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!sidebarOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [sidebarOpen])

  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className="flex min-h-screen">
      <Sidebar id={SIDEBAR_ID} open={sidebarOpen} onNavigate={closeSidebar} />
      {sidebarOpen && (
        <div
          aria-hidden="true"
          onClick={closeSidebar}
          className="bg-foreground/40 fixed inset-0 z-30 lg:hidden"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          sidebarId={SIDEBAR_ID}
          sidebarOpen={sidebarOpen}
          onOpenSidebar={() => setSidebarOpen(true)}
        />
        <main className="w-full max-w-360 flex-1 p-4 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
