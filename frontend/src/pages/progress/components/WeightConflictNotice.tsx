import { isApiError } from '../../../lib/api'
import { formatIsoDate } from '../../../lib/iso-date'
import {
  formatWeightKg,
  useWeights,
  type WeightRecord,
} from '../../../lib/weights'
import { OutlineButton } from '../../../ui/button'
import { Callout } from '../../../ui/callout'
import { Pencil, RotateCw } from '../../../ui/icons'
import { CONFLICT_ID } from '../element-ids'

type WeightConflictNoticeProps = {
  athleteId: string
  // fecha que ya tenía un registro (409)
  date: string
  onEdit: (record: WeightRecord) => void
}

// el 409 no trae el registro existente: se busca el de ese día (contrato de API, 8.7)
export function WeightConflictNotice({
  athleteId,
  date,
  onEdit,
}: WeightConflictNoticeProps) {
  const { data, error, isFetching, refetch } = useWeights(athleteId, {
    from: date,
    to: date,
    size: 1,
  })
  const record = data?.content[0]
  const day = formatIsoDate(date)

  // el registro cambió de fecha en el medio: se puede volver a guardar
  if (data && !record) {
    return (
      <div id={CONFLICT_ID} tabIndex={-1} className="focus:outline-none">
        <Callout tone="info">
          El registro del {day} ya no existe. Volvé a guardar.
        </Callout>
      </div>
    )
  }

  const action = () => {
    if (record) {
      return (
        <OutlineButton size="sm" onClick={() => onEdit(record)}>
          <Pencil aria-hidden="true" /> Editar ese registro
        </OutlineButton>
      )
    }
    if (error && !isFetching) {
      return (
        <OutlineButton size="sm" onClick={() => void refetch()}>
          <RotateCw aria-hidden="true" /> Reintentar
        </OutlineButton>
      )
    }
    return (
      <OutlineButton size="sm" disabled>
        Buscando el registro...
      </OutlineButton>
    )
  }

  return (
    <div id={CONFLICT_ID} tabIndex={-1} className="focus:outline-none">
      <Callout tone="warning" title="Ya registraste tu peso ese día.">
        {record
          ? `El ${day} tiene un registro de ${formatWeightKg(record.weightKg)}.`
          : `El ${day} ya tiene un registro.`}
        {error && !record && (
          <span className="mt-1 block">
            No se pudo traer ese registro.{' '}
            {isApiError(error) ? error.message : ''}
          </span>
        )}
        <span className="mt-3 flex">{action()}</span>
      </Callout>
    </div>
  )
}
