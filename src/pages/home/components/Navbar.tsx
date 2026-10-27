import { useNavigate } from 'react-router-dom'
import { Brand } from '../../../layout'
import { useAuth } from '../../../lib/auth'
import { paths } from '../../../router/paths'
import { PrimaryButton } from '../../../ui/button'

export function Navbar() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  return (
    <header className="border-border-subtle bg-background/90 sticky top-0 z-20 border-b backdrop-blur-sm">
      <nav className="mx-auto flex h-16 max-w-360 items-center justify-between gap-4 px-4 sm:px-8 lg:h-18">
        <Brand />
        {/* el dashboard muestra el panel del rol de la sesión */}
        <PrimaryButton
          onClick={() =>
            navigate(isAuthenticated ? paths.dashboard : paths.login)
          }
        >
          {isAuthenticated ? 'Dashboard' : 'Iniciar sesión'}
        </PrimaryButton>
      </nav>
    </header>
  )
}
