import { beforeEach, describe, expect, it, vi } from 'vitest'
import { get, post, put } from '../api'
import {
  bodyMeasurementRecord,
  bodyMeasurementsPage,
  bodyMeasurementTypes,
} from '../../test/body-measurement-fixtures'
import { createBodyMeasurement } from './create-body-measurement'
import { getBodyMeasurementTypes } from './get-body-measurement-types'
import { getBodyMeasurements } from './get-body-measurements'
import { updateBodyMeasurement } from './update-body-measurement'
import type { BodyMeasurementRecordInput } from './types'

vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
}))

const ATHLETE_ID = '3f1c2a9e-8b7d-4c1e-9a2b-5d6e7f8a9b0c'
const RECORD_ID = '9b1e4c2d-7a3f-4e8b-8c5d-2f1a0b9c8d7e'
const input: BodyMeasurementRecordInput = {
  date: '2026-11-18',
  comment: null,
  values: [{ type: 'ARM', side: 'LEFT', value: 34.8 }],
}

beforeEach(() => {
  vi.mocked(get).mockReset()
  vi.mocked(post).mockReset()
  vi.mocked(put).mockReset()
})

describe('acciones de las medidas corporales', () => {
  it('el catálogo se pide sin atleta: GET /body-measurement-types', async () => {
    vi.mocked(get).mockResolvedValue(bodyMeasurementTypes)

    await expect(getBodyMeasurementTypes()).resolves.toEqual(
      bodyMeasurementTypes,
    )
    expect(get).toHaveBeenCalledWith('/body-measurement-types')
  })

  it('el listado pide /athletes/{id}/measurements con el rango y la paginación', async () => {
    vi.mocked(get).mockResolvedValue(bodyMeasurementsPage())

    await getBodyMeasurements(ATHLETE_ID, {
      from: '2026-11-01',
      to: '2026-11-18',
      page: 0,
      size: 100,
    })

    expect(get).toHaveBeenCalledWith(`/athletes/${ATHLETE_ID}/measurements`, {
      params: { from: '2026-11-01', to: '2026-11-18', page: 0, size: 100 },
    })
  })

  it('el alta hace POST con el body tal cual, y devuelve el registro', async () => {
    const created = bodyMeasurementRecord()
    vi.mocked(post).mockResolvedValue(created)

    await expect(createBodyMeasurement(ATHLETE_ID, input)).resolves.toEqual(
      created,
    )
    expect(post).toHaveBeenCalledWith(
      `/athletes/${ATHLETE_ID}/measurements`,
      input,
    )
  })

  it('la edición hace PUT sobre el registro con la lista completa', async () => {
    vi.mocked(put).mockResolvedValue(bodyMeasurementRecord())

    await updateBodyMeasurement(ATHLETE_ID, RECORD_ID, input)

    expect(put).toHaveBeenCalledWith(
      `/athletes/${ATHLETE_ID}/measurements/${RECORD_ID}`,
      input,
    )
  })
})
