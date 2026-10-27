// tonos semánticos compartidos por Badge, IconChip, Avatar y Callout
export type Tone =
  'primary' | 'neutral' | 'success' | 'warning' | 'danger' | 'info'

// fondo suave + texto del tono; warning usa texto oscuro porque el ámbar no contrasta
export const softToneClasses: Record<Tone, string> = {
  primary: 'bg-primary-soft-strong text-primary',
  neutral: 'bg-secondary text-secondary-foreground',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning-foreground',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
}
