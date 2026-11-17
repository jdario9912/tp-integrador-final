import { useEffect, useRef, useState } from 'react'

// ancho real del contenedor, para dibujar el SVG en píxeles y no escalar el texto del gráfico.
// Sin ResizeObserver (jsdom) o sin medida, usa el ancho de respaldo
export function useElementWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T | null>(null)
  const [width, setWidth] = useState(fallback)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const update = () => setWidth(element.clientWidth || fallback)
    update()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [fallback])

  return { ref, width }
}
