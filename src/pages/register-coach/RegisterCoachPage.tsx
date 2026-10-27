import { AuthLayout } from '../../layout'
import { paths } from '../../router/paths'
import { TextLink } from '../../ui/text-link'
import { RegisterCoachForm } from './components/RegisterCoachForm'

export function RegisterCoachPage() {
  return (
    <AuthLayout
      title="Registro de entrenador"
      description="Creá tu cuenta para gestionar a tus atletas."
    >
      <RegisterCoachForm />
      <p className="text-muted-foreground text-center text-[15px]">
        ¿Ya tenés cuenta?{' '}
        <TextLink to={paths.login} className="text-[15px]">
          Iniciá sesión
        </TextLink>
      </p>
    </AuthLayout>
  )
}
