import { useCallback, useEffect, useRef } from 'react'

// mueve el foco después del próximo render, porque el destino puede aparecer recién ahí
// (el aviso de éxito, el botón Editar que vuelve a la lista). Recibe ids en orden de
// preferencia y enfoca el primero que exista. Se usa junto con un cambio de estado,
// que es el que provoca ese render
export const usePendingFocus = () => {
  const pending = useRef<string[] | null>(null)

  useEffect(() => {
    const ids = pending.current
    if (!ids) return
    pending.current = null
    const target = ids
      .map((id) => document.getElementById(id))
      .find((element) => element !== null)
    target?.focus()
  })

  return useCallback((...ids: string[]) => {
    pending.current = ids
  }, [])
}
