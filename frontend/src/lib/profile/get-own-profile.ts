import { get } from '../api'
import type { OwnProfile } from './types'

// siempre sobre el usuario del token: no hay id en la ruta (CE-4 de US-48)
export const getOwnProfile = () => get<OwnProfile>('/users/me/profile')
