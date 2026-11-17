import { useEffect, useRef, useState } from 'react'
import { PageHeader } from '../../layout'
import { isApiError } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { formatIsoDate, todayInAppTimeZone } from '../../lib/iso-date'
import {
  mealTypeLabel,
  useCreateMeal,
  useDeleteMeal,
  useMealsOfDay,
  useUpdateMeal,
  type Meal,
} from '../../lib/meals'
import { useSearchParams } from '../../lib/navigation'
import { Callout } from '../../ui/callout'
import { Card } from '../../ui/card'
import { ConfirmDialog } from '../../ui/confirm-dialog'
import { Pencil, Utensils } from '../../ui/icons'
import { DailySummaryCard } from './components/DailySummaryCard'
import { DayNavigator } from './components/DayNavigator'
import { MealForm } from './components/MealForm'
import { MealsList } from './components/MealsList'
import { dayParams, dayTitle, resolveDay } from './day-navigation'
import { useDailyNutritionSummary } from './hooks/use-daily-nutrition-summary'
import { useMealEditor } from './hooks/use-meal-editor'
import {
  emptyMealFormValues,
  toMealFormValues,
  toMealInput,
} from './meal-form-values'
import { hourInAppTimeZone, suggestedMealType } from './suggested-meal-type'
import type { MealFormValues } from './types'

const UNEXPECTED_ERROR = 'Ocurrió un error inesperado. Intentá nuevamente.'

// registro de comidas (US-23) por día (US-24): el atleta mira un día (hoy o uno anterior), ve su
// resumen nutricional, y carga, corrige y borra sus comidas. Las calorías las calcula el backend
export function MealsPage() {
  const { user } = useAuth()
  // el atleta es el usuario de la sesión: el mismo id que devuelve GET /auth/me
  const athleteId = user?.id ?? ''
  // "hoy" en la zona de la app: el día por defecto y el último al que se puede navegar
  const today = todayInAppTimeZone()

  // el día que se mira va en la URL (?date=) para volver a él y compartirlo
  const [searchParams, setSearchParams] = useSearchParams()
  const rawDate = searchParams.get('date')
  // fecha inválida o futura en la URL: se muestra hoy y la URL se corrige
  const day = resolveDay(rawDate, today)
  const isToday = day === today

  useEffect(() => {
    if (rawDate !== null && rawDate !== day) {
      setSearchParams(dayParams(day, today), { replace: true })
    }
  }, [rawDate, day, today, setSearchParams])

  const list = useMealsOfDay(athleteId, day)
  const summary = useDailyNutritionSummary(athleteId, day)
  const createMeal = useCreateMeal(athleteId)
  const updateMeal = useUpdateMeal(athleteId)
  const deleteMeal = useDeleteMeal(athleteId)
  const [{ editing, notice, formVersion }, dispatch] = useMealEditor()
  const [toDelete, setToDelete] = useState<Meal | null>(null)
  const [deleteError, setDeleteError] = useState<string>()
  // en móvil el formulario queda arriba: al editar desde la lista se lleva el foco ahí
  const formHeadingRef = useRef<HTMLHeadingElement>(null)

  const isEditing = editing !== null
  const focusForm = () => formHeadingRef.current?.focus()
  // cómo se nombra el día en los avisos: "de hoy" o "del 12 de noviembre de 2026"
  const dayPhrase = isToday ? 'de hoy' : `del ${formatIsoDate(day)}`

  const goToDay = (next: string) => {
    // cambiar de día deja el alta: una edición no sigue a la vista de otro día, y el aviso era de este
    dispatch({ type: 'cancel' })
    setSearchParams(dayParams(next, today))
  }

  const startEdit = (meal: Meal) => {
    dispatch({ type: 'edit', meal })
    focusForm()
  }

  const cancelEdit = () => {
    dispatch({ type: 'cancel' })
    focusForm()
  }

  // la mutación termina con la lista ya actualizada (la invalida y espera el refetch)
  const submit = async (values: MealFormValues) => {
    dispatch({ type: 'submit' })
    const label = mealTypeLabel(values.type).toLowerCase()
    try {
      if (editing) {
        // la edición conserva el día de la comida
        await updateMeal.mutateAsync({
          mealId: editing.id,
          input: toMealInput(values, editing.date),
        })
        dispatch({
          type: 'saved',
          notice: `Guardaste los cambios de ${label}.`,
        })
      } else {
        // el alta es para el día que se mira (nunca futuro)
        await createMeal.mutateAsync(toMealInput(values, day))
        dispatch({
          type: 'saved',
          notice: `Registraste ${label} ${dayPhrase}.`,
        })
      }
    } catch (error) {
      // la comida ya no existe (la borraron en otro lado): vuelve el alta y se refresca la lista
      if (editing && isApiError(error) && error.status === 404) {
        dispatch({
          type: 'removed',
          mealId: editing.id,
          notice: 'Esa comida ya no existe. Actualizamos la lista.',
        })
        return
      }
      // el resto (400, 404 de un alimento, 500) lo muestra el formulario
      throw error
    }
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    const target = toDelete
    const label = mealTypeLabel(target.type).toLowerCase()
    setDeleteError(undefined)
    try {
      await deleteMeal.mutateAsync(target.id)
      dispatch({
        type: 'removed',
        mealId: target.id,
        notice: `Borraste ${label} ${dayPhrase}.`,
      })
    } catch (error) {
      if (isApiError(error) && error.status === 404) {
        dispatch({
          type: 'removed',
          mealId: target.id,
          notice: 'Esa comida ya no estaba registrada. Actualizamos la lista.',
        })
      } else {
        setDeleteError(isApiError(error) ? error.message : UNEXPECTED_ERROR)
      }
    }
    setToDelete(null)
  }

  const title = dayTitle(day, today)

  return (
    // scroll-mt: lo que recibe el foco no queda tapado por la barra superior fija
    <div className="flex flex-col gap-6 [&_*]:scroll-mt-24">
      <PageHeader
        title="Comidas"
        description="Registrá lo que comiste: el de hoy o el de un día anterior, con el resumen nutricional de cada día."
      />
      {notice && (
        <Callout tone="success" role="status">
          {notice}
        </Callout>
      )}

      <DayNavigator day={day} today={today} onChangeDay={goToDay} />

      <DailySummaryCard
        summary={summary.data}
        isPending={summary.isPending}
        isRefreshing={summary.isFetching && !summary.isPending}
        error={summary.error}
        onRetry={() => void summary.refetch()}
      />

      {/* mobile-first: primero el formulario; desde xl, formulario a la izquierda y la lista a la derecha */}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Card className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <h2
              ref={formHeadingRef}
              tabIndex={-1}
              className="flex items-center gap-2.5 text-lg font-semibold focus:outline-none sm:text-xl"
            >
              <span
                aria-hidden="true"
                className="text-primary flex [&_svg]:size-5"
              >
                {isEditing ? <Pencil /> : <Utensils />}
              </span>
              {isEditing ? 'Editar comida' : 'Registrar comida'}
            </h2>
            <p className="text-muted-foreground text-sm">
              {isEditing
                ? `Del ${formatIsoDate(editing.date)}. Podés cambiar el tipo, la descripción y los alimentos.`
                : `Elegí el tipo de comida. Escribí qué comiste o buscá los alimentos con su cantidad. Se registra ${isToday ? 'hoy' : `el ${formatIsoDate(day)}`}.`}
            </p>
          </div>
          <MealForm
            // se vuelve a montar al cambiar de modo o después de guardar: arranca con sus valores
            key={`${editing?.id ?? 'new'}-${formVersion}`}
            defaultValues={
              editing
                ? toMealFormValues(editing)
                : emptyMealFormValues(suggestedMealType(hourInAppTimeZone()))
            }
            onSubmit={submit}
            submitLabel={isEditing ? 'Guardar cambios' : 'Registrar comida'}
            onCancel={isEditing ? cancelEdit : undefined}
          />
        </Card>

        <Card className="flex flex-col gap-5">
          <MealsList
            meals={list.data}
            isPending={list.isPending}
            isRefreshing={list.isFetching && !list.isPending}
            error={list.error}
            onRetry={() => void list.refetch()}
            editingId={editing?.id ?? null}
            onEdit={startEdit}
            onDelete={setToDelete}
            label={title}
            emptyTitle={
              isToday
                ? 'Todavía no registraste comidas hoy'
                : 'No registraste comidas ese día'
            }
          />
          {deleteError && <Callout tone="danger">{deleteError}</Callout>}
        </Card>
      </div>

      <ConfirmDialog
        open={toDelete !== null}
        title={
          toDelete
            ? `¿Borrar la comida de ${mealTypeLabel(toDelete.type).toLowerCase()}?`
            : '¿Borrar la comida?'
        }
        description="Se borran también sus alimentos. No se puede deshacer."
        confirmLabel="Borrar"
        tone="danger"
        isPending={deleteMeal.isPending}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
