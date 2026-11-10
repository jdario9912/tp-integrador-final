import { cn } from '../../../lib/cn'
import { formatIsoDate } from '../../../lib/iso-date'
import { formatWeightKg, type WeightRecord } from '../../../lib/weights'
import { Badge } from '../../../ui/badge'
import { OutlineButton } from '../../../ui/button'
import { Pencil } from '../../../ui/icons'
import { editButtonId } from '../element-ids'

type WeightRecordItemProps = {
  record: WeightRecord
  isToday: boolean
  // el registro está abierto en el formulario
  isEditing: boolean
  onEdit: (record: WeightRecord) => void
}

export function WeightRecordItem({
  record,
  isToday,
  isEditing,
  onEdit,
}: WeightRecordItemProps) {
  const day = formatIsoDate(record.date)

  return (
    <li
      className={cn(
        'border-border-subtle flex items-start gap-4 border-b py-4 last:border-b-0',
        // borde y no fondo: el texto secundario mantiene el contraste sobre blanco
        isEditing && 'border-l-primary border-l-[3px] pl-3',
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-lg font-bold tracking-tight tabular-nums">
            {formatWeightKg(record.weightKg)}
          </span>
          {isToday && <Badge>Hoy</Badge>}
        </div>
        <time dateTime={record.date} className="text-muted-foreground text-sm">
          {day}
        </time>
        {record.comment && (
          <p className="text-sm break-words whitespace-pre-line">
            {record.comment}
          </p>
        )}
      </div>
      {isEditing ? (
        <span className="text-primary flex h-10 shrink-0 items-center gap-1.5 text-sm font-semibold [&_svg]:size-4">
          <Pencil aria-hidden="true" /> Editando
        </span>
      ) : (
        <OutlineButton
          id={editButtonId(record.id)}
          size="sm"
          className="shrink-0"
          onClick={() => onEdit(record)}
        >
          <Pencil aria-hidden="true" />
          Editar <span className="sr-only">el registro del {day}</span>
        </OutlineButton>
      )}
    </li>
  )
}
