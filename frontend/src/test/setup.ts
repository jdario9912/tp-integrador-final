import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// jsdom no implementa <dialog>: alcanza con reflejar el atributo open
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.open = true
}
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
  this.open = false
}

// sin globals de vitest, testing-library no limpia el DOM automáticamente
afterEach(() => {
  cleanup()
  // la sesión vive en localStorage: cada test arranca sin sesión
  localStorage.clear()
})
