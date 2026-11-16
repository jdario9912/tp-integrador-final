-- =====================================================================
-- V15 · Revisar entrenamientos: historial y revisión del entrenador (US-21)
-- Tabla: training_sessions (columnas reviewed_at y coach_observation, restricciones e índice del historial)
-- reviewed_at es el último momento en que el entrenador revisó la sesión; null si nunca la revisó. Solo se revisan
-- las sesiones finalizadas (status_id = 2). coach_observation es la observación del entrenador (opcional, hasta 1000
-- caracteres): siempre pertenece a una revisión. Revisar de nuevo reemplaza las dos columnas.
-- =====================================================================

ALTER TABLE training_sessions
    ADD COLUMN reviewed_at        timestamptz  NULL,
    ADD COLUMN coach_observation  varchar(1000) NULL;

-- Solo una sesión finalizada (2) se revisa; en progreso (1) o cancelada (3) no hay revisión
ALTER TABLE training_sessions ADD CONSTRAINT ck_training_sessions_reviewed_at
    CHECK (reviewed_at IS NULL OR status_id = 2);

-- Una observación siempre tiene una revisión
ALTER TABLE training_sessions ADD CONSTRAINT ck_training_sessions_coach_observation
    CHECK (coach_observation IS NULL OR reviewed_at IS NOT NULL);

-- Historial del atleta por fecha, la más reciente primero (la consulta de US-21 ordena por session_date y started_at)
CREATE INDEX ix_training_sessions_athlete_history ON training_sessions (athlete_id, session_date DESC);
