import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../lib/auth'
import { paths } from '../../../router/paths'
import { PrimaryButton } from '../../../ui/button'

export function Navbar() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  return (
    <header className="border-border border-b">
      <nav className="mx-auto flex max-w-5xl items-center justify-end px-4 py-3">
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
