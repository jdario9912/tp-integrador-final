import { describe, expect, it } from 'vitest'
import { validateFoodName, validateNutrient } from './validation'

describe('validateFoodName', () => {
  it.each(['', '   '])('exige el nombre (%j)', (value) => {
    expect(validateFoodName({ value })).toBe('El nombre es obligatorio')
  })

  it('rechaza más de 100 caracteres sin contar los espacios de los bordes', () => {
    expect(validateFoodName({ value: 'a'.repeat(101) })).toBe(
      'El nombre no puede superar los 100 caracteres',
    )
    expect(validateFoodName({ value: ` ${'a'.repeat(100)} ` })).toBeUndefined()
  })
})

describe('validateNutrient · porción de referencia', () => {
  const validate = (value: string) =>
    validateNutrient('referencePortionG')({ value })

  it('es obligatoria', () => {
    expect(validate('  ')).toBe('La porción de referencia es obligatoria')
  })

  it.each(['0', '-5'])('tiene que ser mayor a 0 (%s)', (value) => {
    expect(validate(value)).toBe('La porción de referencia debe ser mayor a 0')
  })

  it('no puede superar 10000', () => {
    expect(validate('10000.01')).toBe(
      'La porción de referencia no puede superar 10000',
    )
    expect(validate('10000')).toBeUndefined()
  })

  it('admite hasta 2 decimales, con punto o coma', () => {
    expect(validate('100.255')).toBe(
      'La porción de referencia admite hasta 2 decimales',
    )
    expect(validate('100,25')).toBeUndefined()
    expect(validate('0.01')).toBeUndefined()
  })

  it.each(['abc', '1e3'])('rechaza lo que no es un número (%s)', (value) => {
    expect(validate(value)).toBe('La porción de referencia debe ser un número')
  })
})

describe('validateNutrient · macros', () => {
  it.each([
    ['caloriesKcal', 'Las calorías son obligatorias'],
    ['proteinG', 'Las proteínas son obligatorias'],
    ['carbsG', 'Los carbohidratos son obligatorios'],
    ['fatG', 'Las grasas son obligatorias'],
  ] as const)('%s es obligatorio', (field, message) => {
    expect(validateNutrient(field)({ value: '' })).toBe(message)
  })

  it.each([
    ['caloriesKcal', 'Las calorías no pueden ser negativas'],
    ['proteinG', 'Las proteínas no pueden ser negativas'],
    ['carbsG', 'Los carbohidratos no pueden ser negativos'],
    ['fatG', 'Las grasas no pueden ser negativas'],
  ] as const)('%s no puede ser negativo', (field, message) => {
    expect(validateNutrient(field)({ value: '-0.5' })).toBe(message)
  })

  it.each([
    ['caloriesKcal', 'Las calorías no pueden superar 10000'],
    ['proteinG', 'Las proteínas no pueden superar 10000'],
    ['carbsG', 'Los carbohidratos no pueden superar 10000'],
    ['fatG', 'Las grasas no pueden superar 10000'],
  ] as const)('%s no puede superar 10000', (field, message) => {
    expect(validateNutrient(field)({ value: '10001' })).toBe(message)
  })

  it.each([
    ['caloriesKcal', 'Las calorías admiten hasta 2 decimales'],
    ['proteinG', 'Las proteínas admiten hasta 2 decimales'],
    ['carbsG', 'Los carbohidratos admiten hasta 2 decimales'],
    ['fatG', 'Las grasas admiten hasta 2 decimales'],
  ] as const)('%s admite hasta 2 decimales', (field, message) => {
    expect(validateNutrient(field)({ value: '1.234' })).toBe(message)
  })

  it('acepta 0 en los macros', () => {
    expect(validateNutrient('fatG')({ value: '0' })).toBeUndefined()
  })
})
