import { formatIsoDate } from '../../../lib/iso-date'
import { Callout } from '../../../ui/callout'

type ExpiredNoticeProps = {
  // último día vigente, YYYY-MM-DD
  endDate: string
}

// CE-2: la rutina vencida se sigue mostrando; el aviso explica qué hacer
export function ExpiredNotice({ endDate }: ExpiredNoticeProps) {
  return (
    <Callout tone="warning" title="Rutina vencida:">
      terminó el {formatIsoDate(endDate)}. Podés seguir viéndola; pedile a tu
      entrenador que te asigne una nueva.
    </Callout>
  )
}
