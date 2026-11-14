import { beforeEach, describe, expect, it, vi } from 'vitest'
import { del, get, postForm } from '../api'
import { deleteProgressPhoto } from './delete-progress-photo'
import { getProgressPhoto, getProgressPhotos } from './get-progress-photos'
import { uploadProgressPhoto } from './upload-progress-photo'

vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  get: vi.fn(),
  del: vi.fn(),
  postForm: vi.fn(),
}))

const ATHLETE_ID = '0a6d2b9e-7c51-4c1e-9d3f-2b8e5f6a7c10'
const PHOTO_ID = '9b1e4c7a-2d3f-4a5b-8c6d-7e8f9a0b1c2d'

beforeEach(() => {
  vi.mocked(get).mockReset()
  vi.mocked(del).mockReset()
  vi.mocked(postForm).mockReset()
})

describe('acciones de fotos de progreso', () => {
  it('el listado pide la página y el tamaño pedidos', async () => {
    vi.mocked(get).mockResolvedValue({ content: [] })

    await getProgressPhotos(ATHLETE_ID, { page: 2, size: 20 })

    expect(get).toHaveBeenCalledWith(`/athletes/${ATHLETE_ID}/photos`, {
      params: { page: 2, size: 20 },
    })
  })

  it('el detalle pide la foto para renovar su URL', async () => {
    vi.mocked(get).mockResolvedValue({ id: PHOTO_ID })

    await getProgressPhoto(ATHLETE_ID, PHOTO_ID)

    expect(get).toHaveBeenCalledWith(
      `/athletes/${ATHLETE_ID}/photos/${PHOTO_ID}`,
    )
  })

  it('la subida manda file, type y takenOn como multipart', async () => {
    vi.mocked(postForm).mockResolvedValue({ id: PHOTO_ID })
    const file = new File(['x'], 'frente.jpg', { type: 'image/jpeg' })

    await uploadProgressPhoto(ATHLETE_ID, {
      file,
      type: 'SIDE',
      takenOn: '2026-11-12',
    })

    const [url, form] = vi.mocked(postForm).mock.calls[0]!
    expect(url).toBe(`/athletes/${ATHLETE_ID}/photos`)
    expect(form).toBeInstanceOf(FormData)
    expect(form.get('file')).toBeInstanceOf(File)
    expect(form.get('type')).toBe('SIDE')
    expect(form.get('takenOn')).toBe('2026-11-12')
  })

  it('sin fecha, la subida no manda takenOn (lo pone el backend)', async () => {
    vi.mocked(postForm).mockResolvedValue({ id: PHOTO_ID })
    const file = new File(['x'], 'frente.png', { type: 'image/png' })

    await uploadProgressPhoto(ATHLETE_ID, { file, type: 'FRONT' })

    const form = vi.mocked(postForm).mock.calls[0]![1]
    expect(form.has('takenOn')).toBe(false)
  })

  it('el borrado llama al DELETE de la foto', async () => {
    vi.mocked(del).mockResolvedValue(undefined)

    await deleteProgressPhoto(ATHLETE_ID, PHOTO_ID)

    expect(del).toHaveBeenCalledWith(
      `/athletes/${ATHLETE_ID}/photos/${PHOTO_ID}`,
    )
  })
})
