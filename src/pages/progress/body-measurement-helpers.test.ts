import { describe, expect, it } from 'vitest'
import {
  bodyMeasurementRecord,
  bodyMeasurementTypes,
} from '../../test/body-measurement-fixtures'
import { formatBodyMeasurementValue } from '../../lib/body-measurements'
import {
  evolutionMetricOptions,
  measurementChartMetric,
  measurementPoints,
  resolveEvolutionMetric,
  WEIGHT_METRIC_KEY,
} from './body-measurement-evolution'
import { fieldKey, measurementFields } from './body-measurement-fields'
import {
  emptyBodyMeasurementFormValues,
  fieldKeyOfServerError,
  toBodyMeasurementFormValues,
  toBodyMeasurementInput,
} from './body-measurement-form-values'
import {
  hasAnyMeasurement,
  validateMeasurementValue,
} from './body-measurement-validation'

// los campos salen del catálogo: una medida por campo, y un campo por lado en las bilaterales
const fields = measurementFields(bodyMeasurementTypes)
const keys = fields.map((field) => field.key)
const field = (key: string) => fields.find((item) => item.key === key)!

describe('campos del formulario', () => {
  it('arma un campo por medida y dos por cada bilateral, en el orden del catálogo', () => {
    expect(keys).toEqual([
      'WAIST',
      'CHEST',
      'HIP',
      'ARM-LEFT',
      'ARM-RIGHT',
      'LEG-LEFT',
      'LEG-RIGHT',
      'BODY_FAT',
    ])
  })

  it('las medidas no bilaterales no tienen lado y las bilaterales lo tienen', () => {
    expect(field('WAIST')).toMatchObject({ type: 'WAIST', side: undefined })
    expect(field('ARM-LEFT')).toMatchObject({ type: 'ARM', side: 'LEFT' })
    expect(field('LEG-RIGHT')).toMatchObject({ type: 'LEG', side: 'RIGHT' })
  })

  it('el nombre y el rango salen del catálogo', () => {
    expect(field('ARM-RIGHT')).toMatchObject({
      label: 'Brazo, lado derecho',
      unit: 'cm',
      min: 5,
      max: 100,
    })
    expect(field('BODY_FAT')).toMatchObject({ label: '% de grasa', unit: '%' })
  })

  it('fieldKey une tipo y lado solo cuando hay lado', () => {
    expect(fieldKey('WAIST')).toBe('WAIST')
    expect(fieldKey('ARM', 'LEFT')).toBe('ARM-LEFT')
  })
})

describe('validación de un valor de medida', () => {
  const waist = field('WAIST')
  const arm = field('ARM-LEFT')

  it('vacío es válido: significa que no se mide', () => {
    expect(validateMeasurementValue('', waist)).toBeUndefined()
    expect(validateMeasurementValue('   ', waist)).toBeUndefined()
  })

  it('acepta la coma decimal y hasta dos decimales', () => {
    expect(validateMeasurementValue('84,5', waist)).toBeUndefined()
    expect(validateMeasurementValue('35.25', arm)).toBeUndefined()
  })

  it('rechaza cero, negativos y texto que no es número', () => {
    expect(validateMeasurementValue('0', waist)).toBe(
      'El valor debe ser mayor a 0',
    )
    expect(validateMeasurementValue('-3', waist)).toBe(
      'El valor debe ser mayor a 0',
    )
    expect(validateMeasurementValue('abc', waist)).toBe(
      'El valor debe ser un número',
    )
  })

  it('rechaza más de dos decimales o más de tres enteros', () => {
    const message = 'El valor admite hasta 3 enteros y 2 decimales'
    expect(validateMeasurementValue('80,555', waist)).toBe(message)
    expect(validateMeasurementValue('1000', waist)).toBe(message)
  })

  it('rechaza lo que queda fuera del rango del catálogo, inclusive en los bordes', () => {
    expect(validateMeasurementValue('4,99', arm)).toBe(
      'El valor debe estar entre 5 y 100',
    )
    expect(validateMeasurementValue('100,01', arm)).toBe(
      'El valor debe estar entre 5 y 100',
    )
    expect(validateMeasurementValue('5', arm)).toBeUndefined()
    expect(validateMeasurementValue('100', arm)).toBeUndefined()
  })
})

describe('al menos una medida', () => {
  it('se cumple con un valor, y no con campos vacíos o solo con espacios', () => {
    expect(hasAnyMeasurement({ WAIST: '', ARM: '  ' })).toBe(false)
    expect(hasAnyMeasurement({ WAIST: '', 'ARM-LEFT': '34,8' })).toBe(true)
  })
})

describe('body del alta y de la edición', () => {
  it('manda solo las medidas con valor, con su tipo y sin "side" en las no bilaterales', () => {
    const values = {
      ...emptyBodyMeasurementFormValues('2026-11-06', fields),
      comment: '  Después de entrenar  ',
      measurements: { WAIST: '84,5', 'ARM-LEFT': '', 'ARM-RIGHT': '35.25' },
    }

    const { input, fieldKeys } = toBodyMeasurementInput(values, fields)

    expect(input).toEqual({
      date: '2026-11-06',
      comment: 'Después de entrenar',
      values: [
        { type: 'WAIST', value: 84.5 },
        { type: 'ARM', side: 'RIGHT', value: 35.25 },
      ],
    })
    expect(input.values[0]).not.toHaveProperty('side')
    expect(fieldKeys).toEqual(['WAIST', 'ARM-RIGHT'])
  })

  it('un comentario vacío va en null', () => {
    const values = {
      ...emptyBodyMeasurementFormValues('2026-11-06', fields),
      comment: '   ',
      measurements: { WAIST: '80' },
    }

    expect(toBodyMeasurementInput(values, fields).input.comment).toBeNull()
  })

  it('traduce un error del servidor sobre values[i] al campo que se mandó en esa posición', () => {
    const fieldKeys = ['WAIST', 'ARM-RIGHT']

    expect(fieldKeyOfServerError('values[1].value', fieldKeys)).toBe(
      'ARM-RIGHT',
    )
    expect(fieldKeyOfServerError('values[0].side', fieldKeys)).toBe('WAIST')
    expect(fieldKeyOfServerError('values', fieldKeys)).toBeUndefined()
    expect(fieldKeyOfServerError('date', fieldKeys)).toBeUndefined()
  })
})

describe('precarga de la edición', () => {
  it('cada campo muestra el valor de su medida, y vacío si el registro no la tiene', () => {
    const values = toBodyMeasurementFormValues(bodyMeasurementRecord(), fields)

    expect(values).toEqual({
      date: '2026-11-06',
      comment: 'Después de entrenar',
      measurements: {
        WAIST: '84.5',
        CHEST: '',
        HIP: '',
        'ARM-LEFT': '',
        'ARM-RIGHT': '35.25',
        'LEG-LEFT': '',
        'LEG-RIGHT': '',
        BODY_FAT: '',
      },
    })
  })
})

describe('métrica de la evolución', () => {
  it('ofrece el peso y después cada campo de medida, con su nombre', () => {
    const options = evolutionMetricOptions(fields)

    expect(options[0]).toEqual({ value: WEIGHT_METRIC_KEY, label: 'Peso' })
    expect(options[1]).toEqual({ value: 'WAIST', label: 'Cintura' })
    expect(options.at(-1)).toEqual({ value: 'BODY_FAT', label: '% de grasa' })
  })

  it('resuelve la clave de la URL y no inventa métricas desconocidas', () => {
    expect(resolveEvolutionMetric('ARM-LEFT', fields)?.label).toBe(
      'Brazo, lado izquierdo',
    )
    expect(resolveEvolutionMetric('CALF', fields)).toBeUndefined()
  })

  it('toma los valores de la medida elegida, en orden de fecha, y salta los registros sin ella', () => {
    const records = [
      bodyMeasurementRecord({
        id: 'a',
        date: '2026-11-10',
        values: [{ type: 'ARM', side: 'LEFT', value: 34.8 }],
      }),
      bodyMeasurementRecord({
        id: 'b',
        date: '2026-11-06',
        values: [
          { type: 'ARM', side: 'RIGHT', value: 35.25 },
          { type: 'WAIST', side: null, value: 84.5 },
        ],
      }),
    ]

    expect(measurementPoints(records, 'ARM-LEFT')).toEqual([
      { date: '2026-11-10', value: 34.8, time: Date.UTC(2026, 10, 10) },
    ])
    expect(
      measurementPoints(records, 'WAIST').map(({ value }) => value),
    ).toEqual([84.5])
    expect(measurementPoints(records, 'LEG-LEFT')).toEqual([])
  })

  it('el gráfico muestra la medida con su unidad y el título con su nombre', () => {
    const metric = measurementChartMetric(field('BODY_FAT'))

    expect(metric.title).toBe('Evolución: % de grasa')
    expect(metric.columnLabel).toBe('% de grasa')
    expect(metric.formatValue(18.5)).toBe('18,5 %')
  })
})

describe('formato de un valor de medida', () => {
  it('usa coma decimal y la unidad, con hasta dos decimales', () => {
    expect(formatBodyMeasurementValue(84.5, 'cm')).toBe('84,5 cm')
    expect(formatBodyMeasurementValue(35.25, 'cm')).toBe('35,25 cm')
    expect(formatBodyMeasurementValue(102, 'cm')).toBe('102 cm')
  })
})
