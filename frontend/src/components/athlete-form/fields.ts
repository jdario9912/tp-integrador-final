import {
  validateEmail,
  validatePassword,
  validateRequired,
} from '../../lib/validation'
import type { ExperienceLevel, Sex } from '../../lib/athletes'
import type { AthleteFieldName, AthleteFormValues } from './types'
import {
  validateAvailableDays,
  validateMeasure,
  validatePastDate,
} from './validation'

export const emptyAthleteFormValues: AthleteFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  phone: '',
  sex: '',
  experienceLevel: '',
  birthDate: '',
  heightCm: '',
  initialWeightKg: '',
  goal: '',
  injuries: '',
  limitations: '',
  availableDays: '',
  startDate: '',
}

export const isAthleteFieldName = (field: string): field is AthleteFieldName =>
  Object.hasOwn(emptyAthleteFormValues, field)

const allFields = Object.keys(emptyAthleteFormValues) as AthleteFieldName[]

// qué campos muestra cada uso del formulario
export const coachCreateFields: ReadonlySet<AthleteFieldName> = new Set(
  allFields,
)

// la contraseña no se edita desde acá: la cambia el propio atleta
export const coachEditFields: ReadonlySet<AthleteFieldName> = new Set(
  allFields.filter((field) => field !== 'password'),
)

// el resto de los datos son opcionales: algunos tienen validador pero aceptan quedar vacíos
export const requiredFields: ReadonlySet<AthleteFieldName> = new Set([
  'firstName',
  'lastName',
  'email',
  'password',
])

export type TextFieldName = Exclude<AthleteFieldName, 'sex' | 'experienceLevel'>

export type TextFieldConfig = {
  name: TextFieldName
  label: string
  control?: 'input' | 'date' | 'number' | 'textarea'
  type?: string
  autoComplete?: string
  placeholder?: string
  hint?: string
  suffix?: string
  max?: string
  // ocupa las dos columnas en pantallas anchas
  wide?: boolean
  validate?: (field: { value: string }) => string | undefined
}

export const personalFields: TextFieldConfig[] = [
  {
    name: 'firstName',
    label: 'Nombre',
    autoComplete: 'off',
    placeholder: 'ej. Juana',
    validate: validateRequired('El nombre es obligatorio'),
  },
  {
    name: 'lastName',
    label: 'Apellido',
    autoComplete: 'off',
    placeholder: 'ej. Pérez',
    validate: validateRequired('El apellido es obligatorio'),
  },
  {
    name: 'email',
    label: 'Email',
    type: 'email',
    autoComplete: 'off',
    placeholder: 'juana.perez@ejemplo.com',
    hint: 'Lo usa para ingresar a la aplicación.',
    wide: true,
    validate: validateEmail,
  },
  {
    name: 'password',
    label: 'Contraseña',
    type: 'password',
    autoComplete: 'new-password',
    hint: 'Contraseña inicial que le vas a compartir al atleta.',
    validate: validatePassword,
  },
  {
    name: 'phone',
    label: 'Teléfono',
    type: 'tel',
    autoComplete: 'off',
  },
]

// va antes del select de sexo; el max se calcula al renderizar para no quedar con el día de carga
export const birthDateField = (max: string): TextFieldConfig => ({
  name: 'birthDate',
  label: 'Fecha de nacimiento',
  control: 'date',
  max,
  validate: validatePastDate,
})

export const bodyFields: TextFieldConfig[] = [
  {
    name: 'heightCm',
    label: 'Altura',
    control: 'number',
    suffix: 'cm',
    placeholder: '0',
    validate: validateMeasure('La altura'),
  },
  {
    name: 'initialWeightKg',
    label: 'Peso inicial',
    control: 'number',
    suffix: 'kg',
    placeholder: '0.0',
    validate: validateMeasure('El peso inicial'),
  },
  {
    name: 'goal',
    label: 'Objetivo',
    placeholder: 'ej. Hipertrofia',
    wide: true,
  },
]

export const trainingFields: TextFieldConfig[] = [
  { name: 'startDate', label: 'Fecha de inicio', control: 'date' },
  {
    name: 'availableDays',
    label: 'Días disponibles',
    control: 'number',
    suffix: 'días/semana',
    placeholder: '0',
    validate: validateAvailableDays,
  },
  {
    name: 'injuries',
    label: 'Lesiones',
    control: 'textarea',
    placeholder: 'Lesiones previas o actuales...',
    wide: true,
  },
  {
    name: 'limitations',
    label: 'Limitaciones',
    control: 'textarea',
    placeholder: 'Disponibilidad, equipamiento, preferencias...',
    wide: true,
  },
]

export const sexOptions: { value: Sex | ''; label: string }[] = [
  { value: '', label: 'Sin especificar' },
  { value: 'MALE', label: 'Masculino' },
  { value: 'FEMALE', label: 'Femenino' },
  { value: 'OTHER', label: 'Otro' },
]

export const experienceOptions: { value: ExperienceLevel; label: string }[] = [
  { value: 'BEGINNER', label: 'Principiante' },
  { value: 'INTERMEDIATE', label: 'Intermedio' },
  { value: 'ADVANCED', label: 'Avanzado' },
]
