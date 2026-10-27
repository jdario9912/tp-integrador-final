import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../lib/cn'

export type SegmentedOption<T extends string> = { value: T; label: string }

export type SegmentedControlProps<T extends string> = Omit<
  ComponentPropsWithoutRef<'fieldset'>,
  'onChange'
> & {
  // nombre del grupo; se anuncia aunque no se vea
  legend: string
  // name compartido por los radios
  name: string
  options: SegmentedOption<T>[]
  value: T
  onValueChange: (value: T) => void
  // track: opciones unidas sobre un fondo (1M/3M/YTD); chips: botones separados (nivel, tipo de comida)
  variant?: 'track' | 'chips'
}

const containerClasses = {
  track: 'inline-flex gap-1 rounded-control bg-secondary p-1',
  chips: 'flex flex-wrap gap-2.5',
}

const optionClasses = {
  track:
    'rounded-lg px-4 py-1.5 text-muted-foreground has-checked:bg-surface has-checked:text-primary has-checked:shadow-sm',
  chips:
    'flex-1 rounded-control border border-border bg-surface px-4 py-2.5 text-center text-muted-foreground hover:border-primary has-checked:border-primary-soft-strong has-checked:bg-primary-soft-strong has-checked:text-primary',
}

// radios nativos visualmente ocultos: teclado (flechas) y lectores de pantalla funcionan solos
export function SegmentedControl<T extends string>({
  legend,
  name,
  options,
  value,
  onValueChange,
  variant = 'track',
  className,
  ...rest
}: SegmentedControlProps<T>) {
  return (
    <fieldset className={cn('min-w-0', className)} {...rest}>
      <legend className="sr-only">{legend}</legend>
      <div className={containerClasses[variant]}>
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              'has-focus-visible:ring-ring cursor-pointer text-sm font-semibold transition-colors has-focus-visible:ring-2',
              optionClasses[variant],
            )}
          >
            <input
              type="radio"
              className="sr-only"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => onValueChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
