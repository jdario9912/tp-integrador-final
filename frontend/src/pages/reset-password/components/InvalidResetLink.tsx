import { useNavigate } from '../../../lib/navigation'
import { paths } from '../../../router/paths'
import { PrimaryButton } from '../../../ui/button'
import { Callout } from '../../../ui/callout'

type InvalidResetLinkProps = { message: string }

// enlace sin token, vencido, ya usado o inválido (US-44): la única salida es pedir otro
export function InvalidResetLink({ message }: InvalidResetLinkProps) {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col gap-5">
      <Callout tone="danger">{message}</Callout>
      <PrimaryButton size="lg" onClick={() => navigate(paths.forgotPassword)}>
        Solicitar un nuevo enlace
      </PrimaryButton>
    </div>
  )
}
