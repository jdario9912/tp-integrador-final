import { put } from '../api'
import type { OwnProfile, UpdateOwnProfileInput } from './types'

export const updateOwnProfile = (input: UpdateOwnProfileInput) =>
  put<OwnProfile, UpdateOwnProfileInput>('/users/me/profile', input)
