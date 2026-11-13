import type { ComponentPropsWithoutRef, KeyboardEvent } from 'react'

export type TabListProps = ComponentPropsWithoutRef<'div'>

const NAVIGATION_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'Home', 'End'])

const nextIndex = (key: string, current: number, last: number) => {
  if (key === 'Home') return 0
  if (key === 'End') return last
  if (key === 'ArrowRight') return current === last ? 0 : current + 1
  return current === 0 ? last : current - 1
}

// pestañas horizontales: ←/→ pasan a la anterior o la siguiente (y dan la vuelta), Inicio y Fin a
// la primera y la última. Activación automática: mover el foco también selecciona, porque los
// paneles ya están cargados. Con Tab se sale de la lista hacia el panel
export function TabList({ onKeyDown, ...rest }: TabListProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event)
    if (event.defaultPrevented || !NAVIGATION_KEYS.has(event.key)) return

    const tabs = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        '[role="tab"]:not(:disabled)',
      ),
    )
    const current = tabs.indexOf(event.target as HTMLElement)
    if (current === -1) return

    event.preventDefault()
    const next = tabs[nextIndex(event.key, current, tabs.length - 1)]
    next.focus()
    next.click()
  }

  return <div {...rest} role="tablist" onKeyDown={handleKeyDown} />
}
