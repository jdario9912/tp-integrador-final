import {
  AxiosError,
  AxiosHeaders,
  type AxiosAdapter,
  type InternalAxiosRequestConfig,
} from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './api-error'
import {
  del,
  get,
  getOptional,
  httpClient,
  patch,
  post,
  postForm,
  put,
} from './client'

const adapter = vi.fn<AxiosAdapter>()

const respondWith = (status: number, data: unknown) =>
  adapter.mockImplementation(async (config) => {
    const response = {
      data,
      status,
      statusText: '',
      headers: new AxiosHeaders(),
      config,
    }
    if (status >= 400) {
      throw new AxiosError(
        'Request failed',
        'ERR_BAD_REQUEST',
        config,
        null,
        response,
      )
    }
    return response
  })

const lastRequest = () =>
  adapter.mock.lastCall?.[0] as InternalAxiosRequestConfig

beforeEach(() => {
  adapter.mockReset()
  httpClient.defaults.adapter = adapter
})

describe('rest client', () => {
  it('get devuelve directamente el body de la respuesta', async () => {
    respondWith(200, [{ id: '1' }])
    await expect(get('/coaches')).resolves.toEqual([{ id: '1' }])
    expect(lastRequest()).toMatchObject({ method: 'get', url: '/coaches' })
  })

  it('getOptional devuelve el body de un 200', async () => {
    respondWith(200, { id: '1' })
    await expect(getOptional('/athletes/1/routine')).resolves.toEqual({
      id: '1',
    })
    expect(lastRequest()).toMatchObject({
      method: 'get',
      url: '/athletes/1/routine',
    })
  })

  it('getOptional devuelve null en un 204, aunque axios deje el body en ""', async () => {
    respondWith(204, '')
    await expect(getOptional('/athletes/1/routine')).resolves.toBeNull()
  })

  it('getOptional convierte el error del backend en ApiError', async () => {
    respondWith(404, {
      timestamp: '2026-11-10T18:00:00Z',
      status: 404,
      error: 'Not Found',
      message: 'No existe el atleta con id 1',
      path: '/api/athletes/1/routine',
    })

    await expect(getOptional('/athletes/1/routine')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      message: 'No existe el atleta con id 1',
    })
  })

  it.each([
    ['post', post],
    ['put', put],
    ['patch', patch],
  ] as const)('%s envía el body serializado', async (method, request) => {
    respondWith(201, { id: '1' })
    await expect(request('/coaches', { name: 'Ana' })).resolves.toEqual({
      id: '1',
    })
    expect(lastRequest()).toMatchObject({
      method,
      data: JSON.stringify({ name: 'Ana' }),
    })
  })

  it('del usa el método delete', async () => {
    respondWith(204, '')
    await del('/coaches/1')
    expect(lastRequest()).toMatchObject({ method: 'delete' })
  })

  it('convierte el error del backend en ApiError', async () => {
    respondWith(409, {
      timestamp: '2026-10-21T17:15:34.404Z',
      status: 409,
      error: 'Conflict',
      message: 'Ya existe un usuario registrado con el email user@example.com',
      path: '/api/coaches',
    })

    const error = await post('/coaches', {}).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 409,
      message: 'Ya existe un usuario registrado con el email user@example.com',
      path: '/api/coaches',
      fieldErrors: [],
    })
  })

  it('incluye los errores por campo de una validación fallida', async () => {
    respondWith(400, {
      timestamp: '2026-10-21T18:43:35.107Z',
      status: 400,
      error: 'Bad Request',
      message: 'La solicitud tiene campos inválidos',
      path: '/api/coaches',
      fieldErrors: [{ field: 'email', message: 'El email es obligatorio' }],
    })

    await expect(post('/coaches', {})).rejects.toMatchObject({
      status: 400,
      message: 'La solicitud tiene campos inválidos',
      fieldErrors: [{ field: 'email', message: 'El email es obligatorio' }],
    })
  })

  it('usa status 0 cuando no hay respuesta del servidor', async () => {
    adapter.mockImplementation(async (config) => {
      throw new AxiosError('Network Error', 'ERR_NETWORK', config)
    })

    await expect(get('/coaches')).rejects.toMatchObject({
      name: 'ApiError',
      status: 0,
    })
  })
})

// US-28: envío de archivos
describe('postForm', () => {
  it('envía el FormData sin el Content-Type JSON y devuelve el body', async () => {
    respondWith(201, { id: 'foto-1' })
    const form = new FormData()
    form.append('type', 'FRONT')

    await expect(postForm('/athletes/1/photos', form)).resolves.toEqual({
      id: 'foto-1',
    })

    const request = lastRequest()
    expect(request).toMatchObject({ method: 'post', url: '/athletes/1/photos' })
    expect(request.data).toBe(form)
    // el navegador pone multipart/form-data con su boundary: no se fija a mano
    expect(request.headers.get('Content-Type')).toBeFalsy()
  })

  it('no cambia el Content-Type de los POST JSON', async () => {
    respondWith(201, { id: '1' })
    await post('/coaches', { name: 'Ana' })
    expect(lastRequest().headers.get('Content-Type')).toBe('application/json')
  })

  it('convierte el error de un archivo rechazado en ApiError', async () => {
    respondWith(415, {
      timestamp: '2026-11-13T20:00:00Z',
      status: 415,
      error: 'Unsupported Media Type',
      message: 'Formato no permitido. Subí una foto en JPG, PNG o WebP',
      path: '/api/athletes/1/photos',
    })

    await expect(
      postForm('/athletes/1/photos', new FormData()),
    ).rejects.toMatchObject({
      name: 'ApiError',
      status: 415,
      message: 'Formato no permitido. Subí una foto en JPG, PNG o WebP',
    })
  })
})
