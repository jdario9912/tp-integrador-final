import type { ReactNode } from 'react'
import { IconButton } from '../../../ui/icon-button'
import { Trash2 } from '../../../ui/icons'

type MealItemRowProps = {
  foodName: string
  // el campo de cantidad lo arma el formulario, con su validación
  quantity: ReactNode
  onRemove: () => void
}

// un alimento de la comida: nombre, cantidad y quitarlo
export function MealItemRow({
  foodName,
  quantity,
  onRemove,
}: MealItemRowProps) {
  return (
    <div className="border-border-subtle bg-surface flex items-end gap-3 rounded-control border p-3">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="truncate text-sm font-semibold">{foodName}</span>
        {quantity}
      </div>
      <IconButton
        aria-label={`Quitar ${foodName}`}
        className="size-11 text-danger hover:bg-danger-soft hover:text-danger"
        onClick={onRemove}
      >
        <Trash2 aria-hidden="true" />
      </IconButton>
    </div>
  )
}
