import type { ComponentPropsWithoutRef, MouseEvent } from 'react'
import { cn } from '../../lib/cn'
import { panelIdOf, tabIdOf, useTabsContext } from './tabs-context'

export type BaseTabProps = Omit<ComponentPropsWithoutRef<'button'>, 'value'> & {
  // identifica la pestaña y su panel
  value: string
}

const baseClasses =
  'inline-flex min-h-11 min-w-0 cursor-pointer gap-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none'

// pestaña sin colores: las variantes los agregan con aria-selected:. Solo la seleccionada entra
// en el orden de Tab; a las demás se llega con las flechas (TabList)
export function BaseTab({ value, className, onClick, ...rest }: BaseTabProps) {
  const { baseId, value: selected, onValueChange } = useTabsContext()
  const isSelected = value === selected

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event)
    if (!event.defaultPrevented) onValueChange(value)
  }

  return (
    <button
      type="button"
      className={cn(baseClasses, className)}
      {...rest}
      role="tab"
      id={tabIdOf(baseId, value)}
      aria-selected={isSelected}
      aria-controls={panelIdOf(baseId, value)}
      tabIndex={isSelected ? 0 : -1}
      onClick={handleClick}
    />
  )
}
