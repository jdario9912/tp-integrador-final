import { describe, expect, it } from 'vitest'
import { meal } from '../../../test/meal-fixtures'
import { initialMealEditorState, mealEditorReducer } from './use-meal-editor'

describe('mealEditorReducer', () => {
  it('editar abre la comida y cambia la versión del formulario', () => {
    const target = meal()
    const state = mealEditorReducer(initialMealEditorState, {
      type: 'edit',
      meal: target,
    })
    expect(state.editing).toBe(target)
    expect(state.formVersion).toBe(1)
  })

  it('cancelar vuelve al alta', () => {
    const editing = mealEditorReducer(initialMealEditorState, {
      type: 'edit',
      meal: meal(),
    })
    const state = mealEditorReducer(editing, { type: 'cancel' })
    expect(state.editing).toBeNull()
    expect(state.formVersion).toBe(2)
  })

  it('guardar vuelve al alta con el aviso', () => {
    const state = mealEditorReducer(initialMealEditorState, {
      type: 'saved',
      notice: 'Registraste almuerzo de hoy.',
    })
    expect(state.editing).toBeNull()
    expect(state.notice).toBe('Registraste almuerzo de hoy.')
  })

  it('borrar la comida que se editaba vuelve al alta', () => {
    const target = meal()
    const editing = mealEditorReducer(initialMealEditorState, {
      type: 'edit',
      meal: target,
    })
    const state = mealEditorReducer(editing, {
      type: 'removed',
      mealId: target.id,
      notice: 'Borraste almuerzo de hoy.',
    })
    expect(state.editing).toBeNull()
    expect(state.notice).toBe('Borraste almuerzo de hoy.')
  })

  it('borrar otra comida no toca la edición en curso', () => {
    const target = meal()
    const editing = mealEditorReducer(initialMealEditorState, {
      type: 'edit',
      meal: target,
    })
    const state = mealEditorReducer(editing, {
      type: 'removed',
      mealId: 'otra',
      notice: 'Borraste cena de hoy.',
    })
    expect(state.editing).toBe(target)
    expect(state.formVersion).toBe(editing.formVersion)
  })

  it('un envío nuevo descarta el aviso anterior', () => {
    const withNotice = mealEditorReducer(initialMealEditorState, {
      type: 'saved',
      notice: 'Registraste almuerzo de hoy.',
    })
    expect(mealEditorReducer(withNotice, { type: 'submit' }).notice).toBeNull()
  })
})
