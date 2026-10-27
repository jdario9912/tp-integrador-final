import type { AthleteStatus } from '../../lib/athletes'
import type { AvatarStatus } from '../../ui/avatar'
import type { Tone } from '../../ui/tone'

type AthleteStatusView = { label: string; tone: Tone; avatar: AvatarStatus }

// cómo se muestra cada estado del backend en la card (badge y punto del avatar)
export const athleteStatusView: Record<AthleteStatus, AthleteStatusView> = {
  ACTIVE: { label: 'Activo', tone: 'primary', avatar: 'active' },
  NEEDS_REVIEW: { label: 'Requiere revisión', tone: 'danger', avatar: 'alert' },
  NO_ROUTINE: { label: 'Sin rutina', tone: 'warning', avatar: 'alert' },
  NO_ACTIVITY: { label: 'Sin actividad', tone: 'warning', avatar: 'alert' },
  INACTIVE: { label: 'Inactivo', tone: 'neutral', avatar: 'inactive' },
}
