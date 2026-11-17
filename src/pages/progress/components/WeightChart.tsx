import { useId } from 'react'
import { formatIsoDate } from '../../../lib/iso-date'
import { formatWeightKg } from '../../../lib/weights'
import { useElementWidth } from '../hooks/use-element-width'
import {
  describeWeightChart,
  formatChartDate,
  formatKgTick,
  niceYAxis,
  pickLabelIndexes,
  xFor,
  yFor,
  type ChartPoint,
} from '../weight-chart-scale'

type WeightChartProps = {
  // ya ordenados de la más antigua a la más nueva (toChartPoints)
  points: ChartPoint[]
}

const HEIGHT = 240
const FALLBACK_WIDTH = 320
// espacio para las etiquetas de kilos (izquierda) y de fechas (abajo)
const PAD = { top: 20, right: 16, bottom: 28, left: 44 }
// una etiqueta de fecha necesita unos 72 px para no pisar a la vecina
const DATE_LABEL_SPACING = 72

// gráfico de evolución en SVG propio (sin librerías): línea, área suave y un punto por registro.
// Cada punto tiene su fecha y su valor en el tooltip del navegador; la misma información, en
// texto, va en la tabla desplegable (teclado y lectores de pantalla)
export function WeightChart({ points }: WeightChartProps) {
  const { ref, width } = useElementWidth<HTMLDivElement>(FALLBACK_WIDTH)
  const titleId = useId()
  const descId = useId()

  if (points.length === 0) return null

  const first = points[0]
  const last = points[points.length - 1]
  const axis = niceYAxis(points.map(({ kg }) => kg))
  const plotWidth = Math.max(width - PAD.left - PAD.right, 1)
  const plotHeight = HEIGHT - PAD.top - PAD.bottom
  const plotBottom = PAD.top + plotHeight
  const plotRight = PAD.left + plotWidth

  const coords = points.map((point) => ({
    ...point,
    x: xFor(point.time, first.time, last.time, PAD.left, plotWidth),
    y: yFor(point.kg, axis, PAD.top, plotHeight),
  }))
  const firstCoord = coords[0]
  const lastCoord = coords[coords.length - 1]

  // con un solo punto no hay línea: solo el punto
  const linePath = coords
    .map(
      ({ x, y }, index) =>
        `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`,
    )
    .join(' ')
  const areaPath =
    coords.length > 1
      ? `${linePath} L${lastCoord.x.toFixed(1)} ${plotBottom} L${firstCoord.x.toFixed(1)} ${plotBottom} Z`
      : undefined

  // se descarta toda etiqueta de fecha que pisaría a la siguiente; la última siempre se conserva
  const candidates = pickLabelIndexes(
    coords.length,
    Math.floor(plotWidth / DATE_LABEL_SPACING),
  )
  const labelIndexes = candidates.filter((index, position) => {
    if (index === coords.length - 1) return true
    const next = candidates[position + 1]
    return (
      next === undefined ||
      coords[next].x - coords[index].x >= DATE_LABEL_SPACING / 2
    )
  })

  const dateAnchor = (index: number) => {
    if (coords.length === 1) return 'middle'
    if (index === 0) return 'start'
    if (index === coords.length - 1) return 'end'
    return 'middle'
  }

  return (
    <figure className="m-0 flex min-w-0 flex-col gap-3">
      <div ref={ref} className="w-full min-w-0">
        <svg
          role="img"
          aria-labelledby={titleId}
          aria-describedby={descId}
          width={width}
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          className="block overflow-visible"
        >
          <title id={titleId}>Evolución del peso</title>
          <desc id={descId}>{describeWeightChart(points)}</desc>

          {axis.ticks.map((tick) => {
            const y = yFor(tick, axis, PAD.top, plotHeight)
            return (
              <g key={tick}>
                <line
                  x1={PAD.left}
                  x2={plotRight}
                  y1={y}
                  y2={y}
                  strokeWidth={1}
                  className="stroke-border-subtle"
                />
                <text
                  x={PAD.left - 8}
                  y={y}
                  dominantBaseline="middle"
                  textAnchor="end"
                  className="fill-muted-foreground text-xs tabular-nums"
                >
                  {formatKgTick(tick)}
                </text>
              </g>
            )
          })}

          {areaPath && <path d={areaPath} className="fill-primary-soft" />}
          {areaPath && (
            <path
              d={linePath}
              fill="none"
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              className="stroke-primary"
            />
          )}

          {labelIndexes.map((index) => (
            <text
              key={points[index].date}
              x={coords[index].x}
              y={HEIGHT - 6}
              textAnchor={dateAnchor(index)}
              className="fill-muted-foreground text-xs"
            >
              {formatChartDate(points[index].date)}
            </text>
          ))}

          {coords.map((point, index) => {
            const isLast = index === coords.length - 1
            return (
              <circle
                key={point.date}
                cx={point.x}
                cy={point.y}
                r={isLast ? 5 : 3.5}
                strokeWidth={2}
                className={
                  isLast
                    ? 'fill-primary stroke-surface'
                    : 'fill-surface stroke-primary'
                }
              >
                <title>{`${formatIsoDate(point.date)}: ${formatWeightKg(point.kg)}`}</title>
              </circle>
            )
          })}
        </svg>
      </div>

      {/* el último valor va como texto debajo: así no lo cruza la línea */}
      <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
        <span className="text-muted-foreground">Último registro</span>
        <strong className="font-semibold tabular-nums">
          {formatWeightKg(last.kg)}
        </strong>
        <span className="text-muted-foreground">
          del {formatIsoDate(last.date)}
        </span>
      </p>

      {points.length === 1 && (
        <figcaption className="text-muted-foreground text-sm">
          Con un solo registro se ve el punto. Cargá otro día para ver la línea.
        </figcaption>
      )}

      <details className="border-border-subtle rounded-control border px-4 py-3 text-sm">
        <summary className="text-primary cursor-pointer font-semibold">
          Ver los datos del gráfico
        </summary>
        <table className="mt-3 w-full border-collapse">
          <caption className="sr-only">
            Peso por día en el rango elegido
          </caption>
          <thead>
            <tr className="text-muted-foreground text-left">
              <th scope="col" className="pb-2 font-medium">
                Fecha
              </th>
              <th scope="col" className="pb-2 text-right font-medium">
                Peso
              </th>
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={point.date} className="border-border-subtle border-t">
                <td className="py-2">
                  <time dateTime={point.date}>{formatIsoDate(point.date)}</time>
                </td>
                <td className="py-2 text-right tabular-nums">
                  {formatWeightKg(point.kg)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}
