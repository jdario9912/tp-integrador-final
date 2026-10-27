import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '../../layout'
import { paths } from '../../router/paths'
import { TextLink } from '../../ui/text-link'
import { RegisterAthleteForm } from './components/RegisterAthleteForm'

export function RegisterAthletePage() {
  return (
    <div className="flex max-w-265 flex-col gap-6">
      <TextLink
        to={paths.dashboard}
        className="text-muted-foreground hover:text-primary self-start"
      >
        <ArrowLeft aria-hidden="true" /> Volver al panel
      </TextLink>
      <PageHeader
        title="Agregar nuevo atleta"
        description="Ingresá sus datos para incorporarlo a tu lista de atletas."
      />
      <RegisterAthleteForm />
    </div>
  )
}
