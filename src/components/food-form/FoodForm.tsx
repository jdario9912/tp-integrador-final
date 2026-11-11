import { useForm } from '@tanstack/react-form'
import { useState, type SubmitEventHandler } from 'react'
import { isApiError } from '../../lib/api'
import { GhostButton, PrimaryButton } from '../../ui/button'
import { Callout } from '../../ui/callout'
import { SectionCard } from '../../ui/card'
import { FormField, getFieldErrorId, getFieldHintId } from '../../ui/form-field'
import { Apple, Flame } from '../../ui/icons'
import { NumberInput, TextInput } from '../../ui/input'
import { emptyFoodFormValues } from './mappers'
import type { FoodFieldName, FoodFormValues, NutrientFieldName } from './types'
import {
  FOOD_NAME_MAX_LENGTH,
  NUTRIENT_MAX,
  validateFoodName,
  validateNutrient,
} from './validation'

type FoodFormProps = {
  defaultValues?: FoodFormValues
  // si rechaza con un ApiError, sus errores se muestran en el formulario
  onSubmit: (values: FoodFormValues) => Promise<void>
  onCancel: () => void
  submitLabel: string
  // prefijo de los ids de los campos, para que no choquen si hay dos formularios
  idPrefix: string
}

type MacroField = {
  name: Exclude<NutrientFieldName, 'referencePortionG'>
  label: string
  suffix: string
}

const MACRO_FIELDS: MacroField[] = [
  { name: 'caloriesKcal', label: 'Calorías', suffix: 'kcal' },
  { name: 'proteinG', label: 'Proteínas', suffix: 'g' },
  { name: 'carbsG', label: 'Carbohidratos', suffix: 'g' },
  { name: 'fatG', label: 'Grasas', suffix: 'g' },
]

const isFoodFieldName = (field: string): field is FoodFieldName =>
  Object.hasOwn(emptyFoodFormValues, field)

const PORTION_HINT =
  'Gramos a los que corresponden los valores nutricionales (ej. 100).'

// datos del alimento: lo comparten el alta y la edición
export function FoodForm({
  defaultValues = emptyFoodFormValues,
  onSubmit,
  onCancel,
  submitLabel,
  idPrefix,
}: FoodFormProps) {
  const [formError, setFormError] = useState<string>()

  const fieldId = (name: FoodFieldName) => `${idPrefix}-${name}`

  // el error tiene prioridad sobre el hint, igual que en FormField
  const describedBy = (name: FoodFieldName, error?: string, hint?: string) => {
    if (error) return getFieldErrorId(fieldId(name))
    if (hint) return getFieldHintId(fieldId(name))
    return undefined
  }

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value, formApi }) => {
      setFormError(undefined)
      try {
        await onSubmit(value)
      } catch (error) {
        if (!isApiError(error)) {
          setFormError('Ocurrió un error inesperado. Intentá nuevamente.')
          return
        }

        // onServer se limpia solo cuando el usuario vuelve a editar el campo
        const setServerError = (field: FoodFieldName, message: string) =>
          formApi.setFieldMeta(field, (meta) => ({
            ...meta,
            errorMap: { ...meta.errorMap, onServer: message },
          }))

        // 409: ya hay un alimento con ese nombre (sin distinguir mayúsculas); llega sin
        // errores por campo, pero es un problema del nombre
        if (error.status === 409 && error.fieldErrors.length === 0) {
          setServerError('name', error.message)
          return
        }

        const unmappedErrors = error.fieldErrors.filter(
          ({ field }) => !isFoodFieldName(field),
        )
        error.fieldErrors.forEach(({ field, message }) => {
          if (isFoodFieldName(field)) setServerError(field, message)
        })

        // 403 (un atleta) y los errores sin campo van al aviso general
        if (error.fieldErrors.length === 0 || unmappedErrors.length > 0) {
          setFormError(error.message)
        }
      }
    },
  })

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()
    void form.handleSubmit()
  }

  return (
    <form noValidate className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <SectionCard title="Datos del alimento" icon={<Apple />}>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <form.Field name="name" validators={{ onBlur: validateFoodName }}>
            {(field) => {
              const error = field.state.meta.errors[0] as string | undefined
              return (
                <FormField
                  label="Nombre"
                  htmlFor={fieldId('name')}
                  error={error}
                  required
                >
                  <TextInput
                    id={fieldId('name')}
                    name="name"
                    autoComplete="off"
                    placeholder="ej. Manzana"
                    maxLength={FOOD_NAME_MAX_LENGTH}
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={Boolean(error)}
                    aria-describedby={describedBy('name', error)}
                  />
                </FormField>
              )
            }}
          </form.Field>

          <form.Field
            name="referencePortionG"
            validators={{ onBlur: validateNutrient('referencePortionG') }}
          >
            {(field) => {
              const error = field.state.meta.errors[0] as string | undefined
              return (
                <FormField
                  label="Porción de referencia"
                  htmlFor={fieldId('referencePortionG')}
                  error={error}
                  hint={PORTION_HINT}
                  required
                >
                  <NumberInput
                    id={fieldId('referencePortionG')}
                    name="referencePortionG"
                    min={0}
                    max={NUTRIENT_MAX}
                    step="any"
                    suffix="g"
                    autoComplete="off"
                    placeholder="ej. 100"
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={Boolean(error)}
                    aria-describedby={describedBy(
                      'referencePortionG',
                      error,
                      PORTION_HINT,
                    )}
                  />
                </FormField>
              )
            }}
          </form.Field>
        </div>
      </SectionCard>

      <SectionCard title="Valores nutricionales por porción" icon={<Flame />}>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {MACRO_FIELDS.map(({ name, label, suffix }) => (
            <form.Field
              key={name}
              name={name}
              validators={{ onBlur: validateNutrient(name) }}
            >
              {(field) => {
                const error = field.state.meta.errors[0] as string | undefined
                return (
                  <FormField
                    label={label}
                    htmlFor={fieldId(name)}
                    error={error}
                    required
                  >
                    <NumberInput
                      id={fieldId(name)}
                      name={name}
                      min={0}
                      max={NUTRIENT_MAX}
                      step="any"
                      suffix={suffix}
                      autoComplete="off"
                      placeholder="0"
                      value={field.state.value}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      onBlur={field.handleBlur}
                      aria-invalid={Boolean(error)}
                      aria-describedby={describedBy(name, error)}
                    />
                  </FormField>
                )
              }}
            </form.Field>
          ))}
        </div>
      </SectionCard>

      {formError && <Callout tone="danger">{formError}</Callout>}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <GhostButton size="lg" onClick={onCancel}>
          Cancelar
        </GhostButton>
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <PrimaryButton type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : submitLabel}
            </PrimaryButton>
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}
