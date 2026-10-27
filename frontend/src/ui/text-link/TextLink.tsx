import { Link, type LinkProps } from 'react-router-dom'
import { cn } from '../../lib/cn'

export type TextLinkProps = LinkProps

// navegación interna con estilo de link; para acciones usar un botón
export function TextLink({ className, ...rest }: TextLinkProps) {
  return (
    <Link
      className={cn(
        'text-primary hover:text-primary-hover focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-sm text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none [&_svg]:size-4',
        className,
      )}
      {...rest}
    />
  )
}
