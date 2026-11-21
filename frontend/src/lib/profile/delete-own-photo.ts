import { del } from '../api'

// 204 también si no había foto (idempotente)
export const deleteOwnPhoto = () => del('/users/me/photo')
