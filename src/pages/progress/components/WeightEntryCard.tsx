import type { ReactNode } from 'react'
import { Callout } from '../../../ui/callout'
import { Card } from '../../../ui/card'
import { IconChip } from '../../../ui/icon-chip'
import { ENTRY_HEADING_ID, NOTICE_ID } from '../element-ids'

type WeightEntryCardProps = {
  title: string
  description: ReactNode
  icon: ReactNode
  // aviso de la última operación exitosa
  notice: string | null
  children: ReactNode
}

// tarjeta del formulario (alta o edición). El título y el aviso reciben el foco por id:
// el título al empezar a editar, el aviso después de guardar
export function WeightEntryCard({
  title,
  description,
  icon,
  notice,
  children,
}: WeightEntryCardProps) {
  return (
    <Card aria-labelledby={ENTRY_HEADING_ID} className="flex flex-col gap-5">
      <div className="border-border-subtle flex items-start gap-3 border-b pb-4">
        <IconChip shape="square" size="sm">
          {icon}
        </IconChip>
        <div className="flex min-w-0 flex-col gap-1">
          <h2
            id={ENTRY_HEADING_ID}
            tabIndex={-1}
            className="text-lg font-semibold focus:outline-none sm:text-xl"
          >
            {title}
          </h2>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
      </div>
      {notice && (
        <div id={NOTICE_ID} tabIndex={-1} className="focus:outline-none">
          <Callout tone="success" role="status">
            {notice}
          </Callout>
        </div>
      )}
      {children}
    </Card>
  )
}
