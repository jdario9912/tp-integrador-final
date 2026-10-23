import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// sin globals de vitest, testing-library no limpia el DOM automáticamente
afterEach(() => {
  cleanup()
})
