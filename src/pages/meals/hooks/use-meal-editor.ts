import { useReducer } from 'react'
import type { Meal } from '../../../lib/meals'

// estado de la página: alta o edición, aviso de la última operación y reinicio del formulario
export type MealEditorState = {
  // comida que se está editando; null = alta
  editing: Meal | null
  // aviso de la última operación exitosa
  notice: string | null
  // al cambiar, el formulario se vuelve a montar con sus valores iniciales
  formVersion: number
}

export type MealEditorAction =
  | { type: 'edit'; meal: Meal }
  | { type: 'cancel' }
  | { type: 'submit' }
  | { type: 'saved'; notice: string }
  // la comida ya no existe (la borraron en otro lugar o se borró desde esta pantalla)
  | { type: 'removed'; mealId: string; notice: string }

export const initialMealEditorState: MealEditorState = {
  editing: null,
  notice: null,
  formVersion: 0,
}

export const mealEditorReducer = (
  state: MealEditorState,
  action: MealEditorAction,
): MealEditorState => {
  switch (action.type) {
    case 'edit':
      return {
        editing: action.meal,
        notice: null,
        formVersion: state.formVersion + 1,
      }
    case 'cancel':
      return { editing: null, notice: null, formVersion: state.formVersion + 1 }
    // un envío nuevo descarta el aviso anterior
    case 'submit':
      return { ...state, notice: null }
    // después de guardar vuelve al alta, con el formulario limpio
    case 'saved':
      return {
        editing: null,
        notice: action.notice,
        formVersion: state.formVersion + 1,
      }
    // si era la comida que se editaba, el formulario vuelve al alta; si no, sigue como estaba
    case 'removed': {
      const wasEditing = state.editing?.id === action.mealId
      return {
        editing: wasEditing ? null : state.editing,
        notice: action.notice,
        formVersion: wasEditing ? state.formVersion + 1 : state.formVersion,
      }
    }
  }
}

export const useMealEditor = () =>
  useReducer(mealEditorReducer, initialMealEditorState)
