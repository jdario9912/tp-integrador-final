import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../lib/cn'
import { panelIdOf, tabIdOf, useTabsContext } from './tabs-context'

export type TabPanelProps = ComponentPropsWithoutRef<'div'> & {
  // el value de la pestaña que lo muestra
  value: string
}

// solo el panel seleccionado muestra su contenido; los demás quedan vacíos y ocultos, así el
// aria-controls de cada pestaña apunta a un elemento que existe. tabIndex 0: con Tab se llega
// al panel aunque no tenga nada enfocable adentro
export function TabPanel({
  value,
  className,
  children,
  ...rest
}: TabPanelProps) {
  const { baseId, value: selected } = useTabsContext()
  const isSelected = value === selected

  return (
    <div
      className={cn(
        'rounded-card focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
        className,
      )}
      {...rest}
      role="tabpanel"
      id={panelIdOf(baseId, value)}
      aria-labelledby={tabIdOf(baseId, value)}
      tabIndex={0}
      hidden={!isSelected}
    >
      {isSelected ? children : null}
    </div>
  )
}
