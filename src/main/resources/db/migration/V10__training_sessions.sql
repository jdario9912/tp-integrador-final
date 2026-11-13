-- =====================================================================
-- V10 · Sesiones de entrenamiento (US-18)
-- Tablas: session_statuses, training_sessions
-- Las columnas siguen el DER (SESSION_STATUSES, TRAINING_SESSIONS), solo las
-- que usa US-18: la hora de fin, el comentario y la sensación del atleta
-- (US-20) y la revisión del entrenador (US-21) las suma cada historia.
-- Los "code" de session_statuses deben coincidir con el enum SessionStatus
-- y los "id" son fijos (el converter guarda el id).
-- =====================================================================

-- =========== CATÁLOGO ===========
-- is_final: la sesión ya no cambia de estado. FINISHED y CANCELLED los usa US-20
CREATE TABLE session_statuses (
    id       smallint    PRIMARY KEY,
    code     varchar(30) NOT NULL UNIQUE,
    name     varchar(50) NOT NULL,
    is_final boolean     NOT NULL
);

INSERT INTO session_statuses (id, code, name, is_final) VALUES
    (1, 'IN_PROGRESS', 'En progreso', false),
    (2, 'FINISHED',    'Finalizada',  true),
    (3, 'CANCELLED',   'Cancelada',   true);

-- =========== TRAINING_SESSIONS ===========
-- Entrenamiento de un día de la rutina activa del atleta. athlete_id repite el atleta de la asignación porque lo
-- necesita el índice único de la sesión en progreso (un índice no cruza tablas).
-- session_date = fecha de started_at en la zona de la app. Las claves foráneas no tienen cascada: los atletas y las
-- asignaciones no se borran, y un día con sesiones no se puede quitar de la rutina (no se pierde la historia)
CREATE TABLE training_sessions (
    id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id     uuid        NOT NULL REFERENCES athletes (user_id),
    assignment_id  uuid        NOT NULL REFERENCES routine_assignments (id),
    routine_day_id uuid        NOT NULL REFERENCES routine_days (id),
    status_id      smallint    NOT NULL REFERENCES session_statuses (id),
    session_date   date        NOT NULL,
    started_at     timestamptz NOT NULL
);

-- Una sola sesión en progreso (status_id = 1, IN_PROGRESS) por atleta, aunque dos inicios lleguen en paralelo.
-- El predicado usa el id porque no puede consultar el catálogo
CREATE UNIQUE INDEX ux_training_sessions_athlete_in_progress ON training_sessions (athlete_id) WHERE status_id = 1;

-- Saber si un día tiene sesiones (no se puede quitar de la rutina) y verificar la clave foránea al borrar un día
CREATE INDEX ix_training_sessions_routine_day ON training_sessions (routine_day_id);

-- Consultas por asignación (la rotación de días de US-20) y verificación de la clave foránea
CREATE INDEX ix_training_sessions_assignment ON training_sessions (assignment_id);
