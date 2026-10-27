import { ImagePlus } from 'lucide-react'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type FileInputProps = Omit<ComponentPropsWithoutRef<'input'>, 'type'> & {
  // texto visible del área, también nombra al input
  children: ReactNode
  icon?: ReactNode
}

// el input nativo queda oculto dentro del label: click y teclado abren el selector de archivos
export function FileInput({
  className,
  children,
  icon = <ImagePlus />,
  accept = 'image/*',
  ...rest
}: FileInputProps) {
  return (
    <label
      className={cn(
        'border-border text-primary hover:border-primary hover:bg-primary-soft has-focus-visible:ring-ring flex min-h-14 cursor-pointer flex-col items-center justify-center gap-2 rounded-control border-[1.5px] border-dashed p-4 text-sm font-semibold transition-colors has-focus-visible:ring-2 has-disabled:cursor-not-allowed has-disabled:opacity-50 [&_svg]:size-6',
        className,
      )}
    >
      <span aria-hidden="true">{icon}</span>
      {children}
      <input type="file" accept={accept} className="sr-only" {...rest} />
    </label>
  )
}
