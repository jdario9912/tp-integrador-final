import type { Role } from '../lib/auth'
import { paths } from '../router/paths'
import {
  ClipboardList,
  Dumbbell,
  LayoutDashboard,
  Users,
  type LucideIcon,
} from '../ui/icons'

export type NavItem = { to: string; label: string; icon: LucideIcon }

// solo secciones que ya existen; cada feature suma su entrada al implementarse
export const navItems: Record<Role, NavItem[]> = {
  COACH: [
    { to: paths.dashboard, label: 'Panel', icon: LayoutDashboard },
    { to: paths.athletes, label: 'Atletas', icon: Users },
    { to: paths.routines, label: 'Rutinas', icon: ClipboardList },
    { to: paths.exercises, label: 'Ejercicios', icon: Dumbbell },
  ],
  ATHLETE: [{ to: paths.dashboard, label: 'Panel', icon: LayoutDashboard }],
}
