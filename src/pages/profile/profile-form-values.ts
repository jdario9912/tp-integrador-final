import type { OwnProfile, UpdateOwnProfileInput } from '../../lib/profile'

export type ProfileFormValues = {
  firstName: string
  lastName: string
  email: string
  phone: string
}

export const toProfileFormValues = (
  profile: OwnProfile,
): ProfileFormValues => ({
  firstName: profile.firstName,
  lastName: profile.lastName,
  email: profile.email,
  phone: profile.phone ?? '',
})

// sin espacios sobrantes; un teléfono vacío se envía como null para quitarlo
export const toUpdateProfileInput = (
  values: ProfileFormValues,
): UpdateOwnProfileInput => ({
  firstName: values.firstName.trim(),
  lastName: values.lastName.trim(),
  email: values.email.trim(),
  phone: values.phone.trim() || null,
})
