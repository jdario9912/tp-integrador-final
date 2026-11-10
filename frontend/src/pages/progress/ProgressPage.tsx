import { PageHeader } from '../../layout'
import { isApiError } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { formatIsoDate, todayInAppTimeZone } from '../../lib/iso-date'
import {
  formatWeightKg,
  useCreateWeight,
  useUpdateWeight,
  type WeightRecord,
} from '../../lib/weights'
import { Pencil, Scale } from '../../ui/icons'
import { LatestWeightsCard } from './components/LatestWeightsCard'
import { WeightConflictNotice } from './components/WeightConflictNotice'
import { WeightEntryCard } from './components/WeightEntryCard'
import { WeightForm } from './components/WeightForm'
import {
  CONFLICT_ID,
  editButtonId,
  ENTRY_HEADING_ID,
  NOTICE_ID,
} from './element-ids'
import { useLatestWeights } from './hooks/use-latest-weights'
import { usePendingFocus } from './hooks/use-pending-focus'
import { useWeightEditor } from './hooks/use-weight-editor'
import type { WeightFormValues } from './types'
import {
  emptyWeightFormValues,
  toWeightFormValues,
  toWeightRecordInput,
} from './weight-form-values'

// página del atleta (US-26): registra su peso, ve sus últimos registros y los corrige.
// US-29 le suma el gráfico de evolución (useWeights con from/to) y la galería de fotos
export function ProgressPage() {
  const { user } = useAuth()
  // el atleta es el usuario de la sesión: el mismo id que devuelve GET /auth/me
  const athleteId = user?.id ?? ''
  // "hoy" en la zona de la app, no en la del navegador (8.8)
  const today = todayInAppTimeZone()

  const latest = useLatestWeights(athleteId)
  const createWeight = useCreateWeight(athleteId)
  const updateWeight = useUpdateWeight(athleteId)
  const [{ editing, conflictDate, notice, formVersion }, dispatch] =
    useWeightEditor()
  const requestFocus = usePendingFocus()

  const startEdit = (record: WeightRecord) => {
    dispatch({ type: 'edit', record })
    requestFocus(ENTRY_HEADING_ID)
  }

  // vuelve al botón que abrió la edición; si ya no está en la lista, al formulario
  const cancelEdit = () => {
    const ids = editing ? [editButtonId(editing.id)] : []
    dispatch({ type: 'cancel' })
    requestFocus(...ids, ENTRY_HEADING_ID)
  }

  const saved = (message: string) => {
    dispatch({ type: 'saved', notice: message })
    requestFocus(NOTICE_ID)
  }

  // la mutación termina con la lista ya actualizada (invalida y espera el refetch)
  const submit = async (values: WeightFormValues) => {
    dispatch({ type: 'submit' })
    const input = toWeightRecordInput(values)
    try {
      if (editing) {
        const record = await updateWeight.mutateAsync({
          weightId: editing.id,
          input,
        })
        saved(
          `Guardaste los cambios del registro del ${formatIsoDate(record.date)}.`,
        )
      } else {
        const record = await createWeight.mutateAsync(input)
        saved(
          `Registraste ${formatWeightKg(record.weightKg)} para el ${formatIsoDate(record.date)}.`,
        )
      }
    } catch (error) {
      // ese día ya tiene un registro: en vez de un error, se ofrece editarlo (8.7)
      if (isApiError(error) && error.status === 409) {
        dispatch({ type: 'conflict', date: input.date })
        requestFocus(CONFLICT_ID)
        return
      }
      throw error
    }
  }

  const isEditing = editing !== null

  return (
    // scroll-mt: lo que recibe el foco no queda tapado por la barra superior fija
    <div className="flex flex-col gap-6 [&_*]:scroll-mt-24">
      <PageHeader
        title="Progreso"
        description="Registrá tu peso corporal y revisá tus últimos registros."
      />
      {/* mobile-first: primero el formulario; desde xl, formulario a la izquierda y lista a la derecha */}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <WeightEntryCard
          icon={isEditing ? <Pencil /> : <Scale />}
          title={isEditing ? 'Editar registro' : 'Registrar peso'}
          description={
            isEditing
              ? `Del ${formatIsoDate(editing.date)}. Podés cambiar la fecha, el peso y el comentario.`
              : 'Un registro por día. Para corregir uno, editalo desde tus últimos registros.'
          }
          notice={notice}
        >
          <WeightForm
            // se vuelve a montar al cambiar de modo o después de guardar: arranca con sus valores
            key={`${editing?.id ?? 'new'}-${formVersion}`}
            idPrefix="weight"
            defaultValues={
              isEditing
                ? toWeightFormValues(editing)
                : emptyWeightFormValues(today)
            }
            maxDate={today}
            onSubmit={submit}
            submitLabel={isEditing ? 'Guardar cambios' : 'Registrar peso'}
            onCancel={isEditing ? cancelEdit : undefined}
          >
            {conflictDate && (
              <WeightConflictNotice
                athleteId={athleteId}
                date={conflictDate}
                onEdit={startEdit}
              />
            )}
          </WeightForm>
        </WeightEntryCard>

        <LatestWeightsCard
          records={latest.data?.content}
          totalElements={latest.data?.totalElements ?? 0}
          isPending={latest.isPending}
          isRefreshing={latest.isFetching && !latest.isPending}
          error={latest.error}
          onRetry={() => void latest.refetch()}
          today={today}
          editingId={editing?.id ?? null}
          onEdit={startEdit}
        />
      </div>
    </div>
  )
}
