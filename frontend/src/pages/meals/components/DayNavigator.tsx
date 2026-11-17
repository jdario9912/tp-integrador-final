import { useEffect, useRef } from 'react'
import { formatIsoDate } from '../../../lib/iso-date'
import { OutlineButton } from '../../../ui/button'
import { IconButton } from '../../../ui/icon-button'
import { ChevronLeft, ChevronRight } from '../../../ui/icons'
import { dayTitle, shiftDay } from '../day-navigation'

type DayNavigatorProps = {
  // día que se mira, YYYY-MM-DD (nunca posterior a hoy)
  day: string
  today: string
  onChangeDay: (day: string) => void
}

const TITLE_ID = 'meals-day-title'

// elige el día que se mira: anterior, siguiente (no pasa de hoy) y volver a hoy
export function DayNavigator({ day, today, onChangeDay }: DayNavigatorProps) {
  const isToday = day === today
  const titleRef = useRef<HTMLHeadingElement>(null)
  // tras navegar, el foco va al título del día: "siguiente" se deshabilita en hoy y el foco se perdería
  const focusTitleOnChange = useRef(false)

  useEffect(() => {
    if (!focusTitleOnChange.current) return
    focusTitleOnChange.current = false
    titleRef.current?.focus()
  }, [day])

  const go = (next: string) => {
    focusTitleOnChange.current = true
    onChangeDay(next)
  }

  return (
    <section
      aria-labelledby={TITLE_ID}
      className="flex flex-col items-center gap-3"
    >
      <div className="flex w-full items-center justify-between gap-2">
        <IconButton
          aria-label="Día anterior"
          className="border-border bg-surface size-11 border"
          onClick={() => go(shiftDay(day, -1))}
        >
          <ChevronLeft aria-hidden="true" />
        </IconButton>

        <div className="flex min-w-0 flex-col items-center gap-0.5 text-center">
          <h2
            id={TITLE_ID}
            ref={titleRef}
            tabIndex={-1}
            className="text-lg font-semibold focus:outline-none sm:text-xl"
          >
            {dayTitle(day, today)}
          </h2>
          <p className="text-muted-foreground text-sm">
            <time dateTime={day}>{formatIsoDate(day)}</time>
          </p>
        </div>

        <IconButton
          aria-label="Día siguiente"
          className="border-border bg-surface size-11 border"
          disabled={isToday}
          onClick={() => go(shiftDay(day, 1))}
        >
          <ChevronRight aria-hidden="true" />
        </IconButton>
      </div>

      {!isToday && (
        <OutlineButton size="sm" onClick={() => go(today)}>
          Volver a hoy
        </OutlineButton>
      )}
    </section>
  )
}
