-- =====================================================================
-- V14 · Finalizar o cancelar entrenamiento (US-20)
-- Tabla: training_sessions (columna ended_at y restricción de coherencia)
-- ended_at es la hora de fin: null mientras la sesión está en progreso (status_id = 1), y con un valor cuando
-- está finalizada (2) o cancelada (3). El resumen (series, volumen) se calcula desde performed_sets: no hay
-- columnas nuevas para eso.
-- =====================================================================

ALTER TABLE training_sessions ADD COLUMN ended_at timestamptz NULL;

-- Red de seguridad para filas cerradas sin hora de fin (hoy no existen: US-20 no estaba implementada). Se usa
-- started_at como hora de fin aproximada para que la restricción pueda crearse
UPDATE training_sessions
   SET ended_at = started_at
 WHERE status_id <> 1 AND ended_at IS NULL;

-- En progreso no hay hora de fin; finalizada o cancelada siempre la hay
ALTER TABLE training_sessions ADD CONSTRAINT ck_training_sessions_ended_at
    CHECK ((status_id = 1) = (ended_at IS NULL));
