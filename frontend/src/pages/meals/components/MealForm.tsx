import { useForm } from '@tanstack/react-form'
import { useEffect, useRef, useState, type SubmitEventHandler } from 'react'
import { isApiError } from '../../../lib/api'
import { MEAL_TYPE_OPTIONS } from '../../../lib/meals'
import { GhostButton, PrimaryButton } from '../../../ui/button'
import { Callout } from '../../../ui/callout'
import {
  FormField,
  getFieldErrorId,
  getFieldHintId,
} from '../../../ui/form-field'
import { NumberInput } from '../../../ui/input'
import { SegmentedControl } from '../../../ui/segmented-control'
import { TextArea } from '../../../ui/textarea'
import {
  DESCRIPTION_ID,
  FOOD_SEARCH_ID,
  quantityFieldId,
  TYPE_GROUP_NAME,
} from '../element-ids'
import { newItemFormValues } from '../meal-form-values'
import type { MealFormValues } from '../types'
import {
  MEAL_DESCRIPTION_MAX_LENGTH,
  MEAL_ITEMS_MAX,
  validateMealContent,
  validateMealDescription,
  validateMealQuantity,
} from '../validation'
import { FoodPicker } from './FoodPicker'
import { MealItemRow } from './MealItemRow'

type MealFormProps = {
  defaultValues: MealFormValues
  // si rechaza con un ApiError, sus errores se muestran en el formulario
  onSubmit: (values: MealFormValues) => Promise<void>
  submitLabel: string
  // solo en la edición: vuelve al alta sin guardar
  onCancel?: () => void
}

const UNEXPECTED_ERROR = 'Ocurrió un error inesperado. Intentá nuevamente.'
const DESCRIPTION_HINT = 'Opcional si cargás alimentos. Hasta 500 caracteres.'

// el 400 del backend trae rutas como "items[0].quantityG": solo las que el formulario muestra
const QUANTITY_PATH = /^items\[(\d+)\]\.quantityG$/

// id del elemento que recibe el foco ante un error de un campo
const focusIdForPath = (path: string, values: MealFormValues) => {
  if (path === 'description') return DESCRIPTION_ID
  if (path === 'items') return FOOD_SEARCH_ID
  const match = QUANTITY_PATH.exec(path)
  const item = match && values.items[Number(match[1])]
  return item ? quantityFieldId(item.key) : undefined
}

// tipo, alimentos con cantidad y descripción de una comida. Lo usan el alta y la edición
export function MealForm({
  defaultValues,
  onSubmit,
  submitLabel,
  onCancel,
}: MealFormProps) {
  const [formError, setFormError] = useState<string>()
  // el foco lo pide el envío (error de validación o del servidor) y se aplica después de renderizar
  const [focusRequest, setFocusRequest] = useState<{ id: string }>()
  const formErrorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (formError) formErrorRef.current?.focus()
  }, [formError])

  useEffect(() => {
    if (focusRequest) document.getElementById(focusRequest.id)?.focus()
  }, [focusRequest])

  const form = useForm({
    defaultValues,
    // reglas que cruzan campos: descripción o alimentos, y el máximo de alimentos
    validators: { onSubmit: validateMealContent },
    onSubmitInvalid: ({ formApi, value }) => {
      // el primer error en orden de pantalla: cantidad, alimentos, descripción
      const quantityIndex = value.items.findIndex(
        (_, index) =>
          formApi.getFieldMeta(`items[${index}].quantityG`)?.errors.length,
      )
      if (quantityIndex !== -1) {
        setFocusRequest({ id: quantityFieldId(value.items[quantityIndex].key) })
      } else if (formApi.getFieldMeta('items')?.errors.length) {
        setFocusRequest({ id: FOOD_SEARCH_ID })
      } else if (formApi.getFieldMeta('description')?.errors.length) {
        setFocusRequest({ id: DESCRIPTION_ID })
      }
    },
    onSubmit: async ({ value, formApi }) => {
      setFormError(undefined)
      try {
        await onSubmit(value)
      } catch (error) {
        if (!isApiError(error)) {
          setFormError(UNEXPECTED_ERROR)
          return
        }

        // onServer se limpia solo cuando el usuario vuelve a editar el campo
        let allMapped = true
        error.fieldErrors.forEach(({ field, message }) => {
          const match = QUANTITY_PATH.exec(field)
          const index = match ? Number(match[1]) : -1
          if (field === 'description' || field === 'items') {
            formApi.setFieldMeta(field, (meta) => ({
              ...meta,
              errorMap: { ...meta.errorMap, onServer: message },
            }))
          } else if (match && value.items[index]) {
            formApi.setFieldMeta(`items[${index}].quantityG`, (meta) => ({
              ...meta,
              errorMap: { ...meta.errorMap, onServer: message },
            }))
          } else {
            // tipo inválido, alimento inexistente u otro campo que no se muestra
            allMapped = false
          }
        })

        // el aviso general sale cuando hay algo que no se pudo ubicar en un campo (404, 403, 400 sin campo)
        if (!allMapped || error.fieldErrors.length === 0) {
          setFormError(error.message)
          return
        }
        const firstField = error.fieldErrors[0]?.field
        const target = firstField && focusIdForPath(firstField, value)
        if (target) setFocusRequest({ id: target })
      }
    },
  })

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()
    void form.handleSubmit()
  }

  return (
    <form noValidate className="flex flex-col gap-5" onSubmit={handleSubmit}>
      <form.Field name="type">
        {(field) => (
          <div className="flex flex-col gap-2">
            {/* el nombre del grupo lo anuncia la leyenda; la etiqueta visible no se repite */}
            <span aria-hidden="true" className="text-sm font-semibold">
              Tipo de comida
            </span>
            <SegmentedControl
              legend="Tipo de comida"
              name={TYPE_GROUP_NAME}
              variant="chips"
              options={MEAL_TYPE_OPTIONS}
              value={field.state.value}
              onValueChange={(value) => field.handleChange(value)}
            />
          </div>
        )}
      </form.Field>

      <form.Field name="items" mode="array">
        {(itemsField) => {
          const items = itemsField.state.value
          const error = itemsField.state.meta.errors[0] as string | undefined
          return (
            <div className="flex flex-col gap-4">
              <FoodPicker
                full={items.length >= MEAL_ITEMS_MAX}
                onPick={(food) => itemsField.pushValue(newItemFormValues(food))}
              />

              {items.length > 0 && (
                <ul
                  aria-label="Alimentos de la comida"
                  className="flex flex-col gap-2"
                >
                  {items.map((item, index) => (
                    <li key={item.key}>
                      <MealItemRow
                        foodName={item.foodName}
                        onRemove={() => itemsField.removeValue(index)}
                        quantity={
                          <form.Field
                            name={`items[${index}].quantityG`}
                            validators={{ onBlur: validateMealQuantity }}
                          >
                            {(quantityField) => {
                              const quantityError = quantityField.state.meta
                                .errors[0] as string | undefined
                              const id = quantityFieldId(item.key)
                              return (
                                <FormField
                                  label={`Cantidad de ${item.foodName}`}
                                  htmlFor={id}
                                  error={quantityError}
                                  required
                                >
                                  <NumberInput
                                    id={id}
                                    name={quantityField.name}
                                    min={0}
                                    step="any"
                                    suffix="g"
                                    autoComplete="off"
                                    placeholder="ej. 150"
                                    aria-required="true"
                                    value={quantityField.state.value}
                                    onChange={(event) =>
                                      quantityField.handleChange(
                                        event.target.value,
                                      )
                                    }
                                    onBlur={quantityField.handleBlur}
                                    aria-invalid={Boolean(quantityError)}
                                    aria-describedby={
                                      quantityError
                                        ? getFieldErrorId(id)
                                        : undefined
                                    }
                                  />
                                </FormField>
                              )
                            }}
                          </form.Field>
                        }
                      />
                    </li>
                  ))}
                </ul>
              )}

              {error && (
                <p
                  id="meal-items-error"
                  role="alert"
                  className="text-danger text-sm"
                >
                  {error}
                </p>
              )}
            </div>
          )
        }}
      </form.Field>

      <form.Field
        name="description"
        validators={{ onBlur: validateMealDescription }}
      >
        {(field) => {
          const error = field.state.meta.errors[0] as string | undefined
          return (
            <FormField
              label="Descripción"
              htmlFor={DESCRIPTION_ID}
              error={error}
              hint={DESCRIPTION_HINT}
            >
              <TextArea
                id={DESCRIPTION_ID}
                name="description"
                rows={2}
                placeholder="¿Qué comiste?"
                maxLength={MEAL_DESCRIPTION_MAX_LENGTH}
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
                aria-invalid={Boolean(error)}
                aria-describedby={
                  error
                    ? getFieldErrorId(DESCRIPTION_ID)
                    : getFieldHintId(DESCRIPTION_ID)
                }
              />
            </FormField>
          )
        }}
      </form.Field>

      {formError && (
        <div ref={formErrorRef} tabIndex={-1} className="focus:outline-none">
          <Callout tone="danger">{formError}</Callout>
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onCancel && (
          <GhostButton size="lg" onClick={onCancel}>
            Cancelar
          </GhostButton>
        )}
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
