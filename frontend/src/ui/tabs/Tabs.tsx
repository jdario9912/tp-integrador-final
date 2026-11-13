import { useId, useMemo, type ComponentPropsWithoutRef } from 'react'
import { TabsContext } from './tabs-context'

export type TabsProps = Omit<ComponentPropsWithoutRef<'div'>, 'onChange'> & {
  // pestaña seleccionada: tiene que ser el value de una de las pestañas (si no, ninguna
  // queda alcanzable con Tab)
  value: string
  onValueChange: (value: string) => void
}

// pestañas por composición (patrón ARIA tabs): <Tabs> guarda la selección, <TabList> agrupa
// las pestañas (BaseTab o una variante, como CardTab) y cada <TabPanel> muestra su contenido
export function Tabs({ value, onValueChange, ...rest }: TabsProps) {
  const baseId = useId()
  const context = useMemo(
    () => ({ baseId, value, onValueChange }),
    [baseId, value, onValueChange],
  )

  return (
    <TabsContext value={context}>
      <div {...rest} />
    </TabsContext>
  )
}
