import { useMemo } from 'react'
import { isApiError } from '../../../lib/api'
import { formatIsoDate } from '../../../lib/iso-date'
import {
  useBodyMeasurementTypes,
  useCreateBodyMeasurement,
  useUpdateBodyMeasurement,
  type BodyMeasurementRecord,
  type BodyMeasurementRecordInput,
} from '../../../lib/body-measurements'
import { OutlineButton } from '../../../ui/button'
import { Callout } from '../../../ui/callout'
import { Card } from '../../../ui/card'
import { IconChip } from '../../../ui/icon-chip'
import { Pencil, Ruler, RotateCw } from '../../../ui/icons'
import { Skeleton } from '../../../ui/skeleton'
import {
  MEASUREMENT_CONFLICT_ID,
  MEASUREMENT_ENTRY_HEADING_ID,
  MEASUREMENT_FIELD_PREFIX,
  MEASUREMENT_NOTICE_ID,
  measurementEditButtonId,
} from '../body-measurement-element-ids'
import {
  measurementFields,
  type MeasurementField,
} from '../body-measurement-fields'
import {
  emptyBodyMeasurementFormValues,
  toBodyMeasurementFormValues,
} from '../body-measurement-form-values'
import { useBodyMeasurementEditor } from '../hooks/use-body-measurement-editor'
import { useLatestBodyMeasurements } from '../hooks/use-latest-body-measurements'
import { usePendingFocus } from '../hooks/use-pending-focus'
import { BodyMeasurementConflictNotice } from './BodyMeasurementConflictNotice'
import { BodyMeasurementForm } from './BodyMeasurementForm'
import { LatestBodyMeasurementsCard } from './LatestBodyMeasurementsCard'

type BodyMeasurementsSectionProps = {
  athleteId: string
  // hoy en la zona de la app
  today: string
}

// US-45 (F2): tarjeta «Medidas corporales» de /progress. Un registro por día, con las medidas del
// catálogo (el backend las define: nombre, unidad y rango). Alta, edición y últimos registros.
// Mismo flujo que el peso: un 409 ofrece editar el registro de ese día
export function BodyMeasurementsSection({
  athleteId,
  today,
}: BodyMeasurementsSectionProps) {
  const types = useBodyMeasurementTypes()
  const fields = useMemo(
    () => (types.data ? measurementFields(types.data) : []),
    [types.data],
  )
  const latest = useLatestBodyMeasurements(athleteId)
  const createMeasurement = useCreateBodyMeasurement(athleteId)
  const updateMeasurement = useUpdateBodyMeasurement(athleteId)
  const [{ editing, conflictDate, notice, formVersion }, dispatch] =
    useBodyMeasurementEditor()
  const requestFocus = usePendingFocus()

  const startEdit = (record: BodyMeasurementRecord) => {
    dispatch({ type: 'edit', record })
    requestFocus(MEASUREMENT_ENTRY_HEADING_ID)
  }

  // vuelve al botón que abrió la edición; si ya no está en la lista, al formulario
  const cancelEdit = () => {
    const ids = editing ? [measurementEditButtonId(editing.id)] : []
    dispatch({ type: 'cancel' })
    requestFocus(...ids, MEASUREMENT_ENTRY_HEADING_ID)
  }

  const saved = (message: string) => {
    dispatch({ type: 'saved', notice: message })
    requestFocus(MEASUREMENT_NOTICE_ID)
  }

  // la mutación termina con la lista ya actualizada (invalida y espera el refetch)
  const submit = async (input: BodyMeasurementRecordInput) => {
    dispatch({ type: 'submit' })
    try {
      if (editing) {
        const record = await updateMeasurement.mutateAsync({
          recordId: editing.id,
          input,
        })
        saved(`Guardaste las medidas del ${formatIsoDate(record.date)}.`)
      } else {
        const record = await createMeasurement.mutateAsync(input)
        saved(`Registraste las medidas del ${formatIsoDate(record.date)}.`)
      }
    } catch (error) {
      // ese día ya tiene un registro: en vez de un error, se ofrece editarlo
      if (isApiError(error) && error.status === 409) {
        dispatch({ type: 'conflict', date: input.date })
        requestFocus(MEASUREMENT_CONFLICT_ID)
        return
      }
      throw error
    }
  }

  const isEditing = editing !== null

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <Card
        aria-labelledby={MEASUREMENT_ENTRY_HEADING_ID}
        className="flex flex-col gap-5"
      >
        <div className="border-border-subtle flex items-start gap-3 border-b pb-4">
          <IconChip shape="square" size="sm">
            {isEditing ? <Pencil /> : <Ruler />}
          </IconChip>
          <div className="flex min-w-0 flex-col gap-1">
            <h2
              id={MEASUREMENT_ENTRY_HEADING_ID}
              tabIndex={-1}
              className="text-lg font-semibold focus:outline-none sm:text-xl"
            >
              {isEditing ? 'Editar medidas' : 'Medidas corporales'}
            </h2>
            <p className="text-muted-foreground text-sm">
              {isEditing
                ? `Del ${formatIsoDate(editing.date)}. Un campo vacío quita esa medida del registro.`
                : 'Un registro por día. Cargá las medidas que tomes; las que dejes vacías no se guardan.'}
            </p>
          </div>
        </div>

        {notice && (
          <div
            id={MEASUREMENT_NOTICE_ID}
            tabIndex={-1}
            className="focus:outline-none"
          >
            <Callout tone="success" role="status">
              {notice}
            </Callout>
          </div>
        )}

        {types.isPending && (
          <div
            role="status"
            aria-label="Cargando las medidas"
            className="flex flex-col gap-3"
          >
            <Skeleton className="h-11 w-full motion-reduce:animate-none" />
            <Skeleton className="h-11 w-full motion-reduce:animate-none" />
          </div>
        )}

        {types.error && (
          <div className="flex flex-col items-start gap-3">
            <Callout tone="danger" className="self-stretch">
              {isApiError(types.error)
                ? types.error.message
                : 'No se pudieron cargar las medidas. Intentá nuevamente.'}
            </Callout>
            <OutlineButton size="sm" onClick={() => void types.refetch()}>
              <RotateCw aria-hidden="true" />
              Reintentar
            </OutlineButton>
          </div>
        )}

        {types.data && (
          <MeasurementEntryForm
            // se vuelve a montar al cambiar de modo o después de guardar: arranca con sus valores
            key={`${editing?.id ?? 'new'}-${formVersion}`}
            fields={fields}
            today={today}
            editing={editing}
            conflictDate={conflictDate}
            athleteId={athleteId}
            onSubmit={submit}
            onCancel={isEditing ? cancelEdit : undefined}
            onEdit={startEdit}
          />
        )}
      </Card>

      <LatestBodyMeasurementsCard
        records={latest.data?.content}
        totalElements={latest.data?.totalElements ?? 0}
        isPending={latest.isPending}
        isRefreshing={latest.isFetching && !latest.isPending}
        error={latest.error}
        onRetry={() => void latest.refetch()}
        today={today}
        editingId={editing?.id ?? null}
        fields={fields}
        onEdit={startEdit}
      />
    </div>
  )
}

type MeasurementEntryFormProps = {
  fields: MeasurementField[]
  today: string
  editing: BodyMeasurementRecord | null
  conflictDate: string | null
  athleteId: string
  onSubmit: (input: BodyMeasurementRecordInput) => Promise<void>
  onCancel?: () => void
  onEdit: (record: BodyMeasurementRecord) => void
}

// el formulario y, si hay choque de fecha, el aviso que ofrece editar ese registro
function MeasurementEntryForm({
  fields,
  today,
  editing,
  conflictDate,
  athleteId,
  onSubmit,
  onCancel,
  onEdit,
}: MeasurementEntryFormProps) {
  return (
    <BodyMeasurementForm
      defaultValues={
        editing
          ? toBodyMeasurementFormValues(editing, fields)
          : emptyBodyMeasurementFormValues(today, fields)
      }
      fields={fields}
      maxDate={today}
      onSubmit={onSubmit}
      submitLabel={editing ? 'Guardar cambios' : 'Registrar medidas'}
      onCancel={onCancel}
      idPrefix={MEASUREMENT_FIELD_PREFIX}
    >
      {conflictDate && (
        <BodyMeasurementConflictNotice
          athleteId={athleteId}
          date={conflictDate}
          onEdit={onEdit}
        />
      )}
    </BodyMeasurementForm>
  )
}
