import { useEffect, useRef, type ReactNode } from 'react'
import { OutlineButton } from '../../../ui/button'
import { IconButton } from '../../../ui/icon-button'
import { ChevronLeft, ChevronRight } from '../../../ui/icons'

type PeriodNavigatorProps = {
  // id del título: lo usa la región que lo contiene para nombrarse
  titleId: string
  title: string
  subtitle: ReactNode
  previousLabel: string
  nextLabel: string
  onPrevious: () => void
  onNext: () => void
  // el período ya llega a hoy: no hay siguiente
  isCurrent: boolean
  // vuelve al período que incluye hoy
  currentLabel: string
  onCurrent: () => void
}

// anterior / siguiente de la alimentación del atleta (US-25), por semana o por día. Mismo esquema que
// el navegador de días de Comidas (US-24): el siguiente no pasa de hoy
export function PeriodNavigator({
  titleId,
  title,
  subtitle,
  previousLabel,
  nextLabel,
  onPrevious,
  onNext,
  isCurrent,
  currentLabel,
  onCurrent,
}: PeriodNavigatorProps) {
  const titleRef = useRef<HTMLHeadingElement>(null)
  // tras navegar, el foco va al título: "siguiente" se deshabilita al llegar a hoy y el foco se perdería
  const focusTitleOnChange = useRef(false)

  useEffect(() => {
    if (!focusTitleOnChange.current) return
    focusTitleOnChange.current = false
    titleRef.current?.focus()
  }, [title, subtitle])

  const go = (navigate: () => void) => () => {
    focusTitleOnChange.current = true
    navigate()
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex w-full items-center justify-between gap-2">
        <IconButton
          aria-label={previousLabel}
          className="border-border bg-surface size-11 border"
          onClick={go(onPrevious)}
        >
          <ChevronLeft aria-hidden="true" />
        </IconButton>

        <div className="flex min-w-0 flex-col items-center gap-0.5 text-center">
          <h3
            id={titleId}
            ref={titleRef}
            tabIndex={-1}
            className="text-base font-semibold first-letter:uppercase focus:outline-none sm:text-lg"
          >
            {title}
          </h3>
          <p className="text-muted-foreground text-sm">{subtitle}</p>
        </div>

        <IconButton
          aria-label={nextLabel}
          className="border-border bg-surface size-11 border"
          disabled={isCurrent}
          onClick={go(onNext)}
        >
          <ChevronRight aria-hidden="true" />
        </IconButton>
      </div>

      {!isCurrent && (
        <OutlineButton size="sm" onClick={go(onCurrent)}>
          {currentLabel}
        </OutlineButton>
      )}
    </div>
  )
}
