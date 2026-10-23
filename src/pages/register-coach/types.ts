export type Coach = {
  id: string
  firstName: string
  lastName: string
  email: string
  // el backend devuelve null en los opcionales que no se enviaron
  phone: string | null
  specialty: string | null
  licenseNumber: string | null
  bio: string | null
  createdAt: string
}

export type CreateCoachInput = {
  firstName: string
  lastName: string
  email: string
  password: string
  phone?: string
  specialty?: string
  licenseNumber?: string
  bio?: string
}

// en el formulario todos los campos son strings; los opcionales vacíos no se envían
export type RegisterCoachFormValues = Required<CreateCoachInput>
