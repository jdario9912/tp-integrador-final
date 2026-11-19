// body de POST /auth/password-reset (US-44)
export type PasswordResetInput = { token: string; newPassword: string }

// la confirmación no viaja al backend: solo evita un error de tipeo que obligue a pedir otro enlace
export type ResetPasswordFormValues = {
  newPassword: string
  confirmPassword: string
}
