import { describe, expect, it } from 'vitest'
import {
  PHOTO_EMPTY_MESSAGE,
  PHOTO_FORMAT_MESSAGE,
  PHOTO_REQUIRED_MESSAGE,
  PHOTO_TOO_LARGE_MESSAGE,
  validatePhotoFile,
} from './validate-photo-file'

const MB = 1024 * 1024

// archivo de prueba: importan el nombre, el tipo MIME y el tamaño
const fileOf = (name: string, type: string, size: number) =>
  new File([new Uint8Array(size)], name, { type })

describe('validatePhotoFile', () => {
  it('pide elegir una foto si no hay archivo', () => {
    expect(validatePhotoFile(null)).toBe(PHOTO_REQUIRED_MESSAGE)
    expect(validatePhotoFile(undefined)).toBe(PHOTO_REQUIRED_MESSAGE)
  })

  it('acepta JPG, PNG y WebP', () => {
    expect(validatePhotoFile(fileOf('frente.jpg', 'image/jpeg', 1000))).toBe(
      undefined,
    )
    expect(validatePhotoFile(fileOf('frente.png', 'image/png', 1000))).toBe(
      undefined,
    )
    expect(validatePhotoFile(fileOf('frente.webp', 'image/webp', 1000))).toBe(
      undefined,
    )
  })

  it('rechaza un formato que no es JPG, PNG ni WebP', () => {
    expect(validatePhotoFile(fileOf('foto.gif', 'image/gif', 1000))).toBe(
      PHOTO_FORMAT_MESSAGE,
    )
    expect(validatePhotoFile(fileOf('cv.pdf', 'application/pdf', 1000))).toBe(
      PHOTO_FORMAT_MESSAGE,
    )
  })

  it('si el navegador no informa el tipo, mira la extensión', () => {
    expect(validatePhotoFile(fileOf('frente.JPG', '', 1000))).toBe(undefined)
    expect(validatePhotoFile(fileOf('frente.heic', '', 1000))).toBe(
      PHOTO_FORMAT_MESSAGE,
    )
  })

  it('rechaza un archivo vacío', () => {
    expect(validatePhotoFile(fileOf('frente.jpg', 'image/jpeg', 0))).toBe(
      PHOTO_EMPTY_MESSAGE,
    )
  })

  it('acepta exactamente 5 MB y rechaza un byte más', () => {
    expect(validatePhotoFile(fileOf('ok.jpg', 'image/jpeg', 5 * MB))).toBe(
      undefined,
    )
    expect(
      validatePhotoFile(fileOf('grande.jpg', 'image/jpeg', 5 * MB + 1)),
    ).toBe(PHOTO_TOO_LARGE_MESSAGE)
    expect(PHOTO_TOO_LARGE_MESSAGE).toBe(
      'La foto supera el tamaño máximo de 5 MB',
    )
  })
})
