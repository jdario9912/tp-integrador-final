import { LayoutDashboard, type LucideIcon } from 'lucide-react'
import type { Role } from '../lib/auth'
import { paths } from '../router/paths'

export type NavItem = { to: string; label: string; icon: LucideIcon }

// solo secciones que ya existen; cada feature suma su entrada al implementarse
export const navItems: Record<Role, NavItem[]> = {
  COACH: [{ to: paths.dashboard, label: 'Panel', icon: LayoutDashboard }],
  ATHLETE: [{ to: paths.dashboard, label: 'Panel', icon: LayoutDashboard }],
}
