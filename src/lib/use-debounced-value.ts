import { useEffect, useState } from 'react'

// devuelve el valor recién cuando deja de cambiar durante `delay` ms (búsquedas mientras se escribe)
export function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timeout)
  }, [value, delay])

  return debounced
}
