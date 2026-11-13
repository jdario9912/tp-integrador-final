import { createContext, useContext } from 'react'

export type TabsContextValue = {
  // prefijo de los ids que unen cada pestaña con su panel
  baseId: string
  // pestaña seleccionada
  value: string
  onValueChange: (value: string) => void
}

export const TabsContext = createContext<TabsContextValue | null>(null)

export const useTabsContext = () => {
  const context = useContext(TabsContext)
  if (!context) {
    throw new Error('Las pestañas y sus paneles van dentro de <Tabs>')
  }
  return context
}

// aria-controls de la pestaña y aria-labelledby del panel
export const tabIdOf = (baseId: string, value: string) =>
  `${baseId}-tab-${value}`
export const panelIdOf = (baseId: string, value: string) =>
  `${baseId}-panel-${value}`
