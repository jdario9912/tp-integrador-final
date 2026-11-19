import { useState } from 'react'
import { isApiError } from '../../../lib/api'
import { OutlineButton } from '../../../ui/button'
import { Callout } from '../../../ui/callout'
import { MailCheck } from '../../../ui/icons'
import { useRequestPasswordRecovery } from '../hooks/use-request-password-recovery'

type RecoverySentProps = {
  email: string
  onChangeEmail: () => void
}

// confirmación neutra del pedido (US-44): no confirma que el email esté registrado
export function RecoverySent({ email, onChangeEmail }: RecoverySentProps) {
  const resend = useRequestPasswordRecovery()
  const [notice, setNotice] = useState<
    { tone: 'success' | 'danger'; text: string } | undefined
  >()

  const handleResend = async () => {
    setNotice(undefined)
    try {
      await resend.mutateAsync({ email })
      setNotice({ tone: 'success', text: 'Te enviamos un enlace nuevo.' })
    } catch (error) {
      setNotice({
        tone: 'danger',
        text: isApiError(error)
          ? error.message
          : 'Ocurrió un error inesperado. Intentá nuevamente.',
      })
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Callout tone="success" role="status" className="flex gap-3">
        <MailCheck
          aria-hidden="true"
          className="text-success size-5 shrink-0"
        />
        <span>
          Si <strong className="break-all">{email}</strong> está registrado, te
          enviamos un enlace para crear una contraseña nueva. Vence en 30
          minutos.
        </span>
      </Callout>
      <p className="text-muted-foreground text-sm">
        ¿No te llegó? Revisá la carpeta de spam o pedí otro enlace.
      </p>
      {notice && (
        <Callout
          tone={notice.tone}
          role={notice.tone === 'success' ? 'status' : undefined}
        >
          {notice.text}
        </Callout>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        <OutlineButton
          size="lg"
          className="sm:flex-1"
          disabled={resend.isPending}
          onClick={() => void handleResend()}
        >
          {resend.isPending ? 'Reenviando...' : 'Reenviar enlace'}
        </OutlineButton>
        <OutlineButton size="lg" className="sm:flex-1" onClick={onChangeEmail}>
          Usar otro email
        </OutlineButton>
      </div>
    </div>
  )
}
