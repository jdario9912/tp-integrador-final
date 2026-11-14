-- =====================================================================
-- V11 · Series registradas en vivo (US-19)
-- Tablas: set_statuses, performed_sets
-- Solo las series prescritas del día de la sesión (1..sets de cada ejercicio). Lo que no tiene fila
-- está pendiente: no hay estado PENDING. Corregir una serie es volver a registrarla (mismo número).
-- Los "code" de set_statuses deben coincidir con el enum SetStatus y los "id" son fijos (el converter guarda el id).
-- =====================================================================

-- =========== CATÁLOGO ===========
CREATE TABLE set_statuses (
    id    smallint    PRIMARY KEY,
    code  varchar(30) NOT NULL UNIQUE,
    name  varchar(50) NOT NULL
);

INSERT INTO set_statuses (id, code, name) VALUES
    (1, 'DONE',    'Realizada'),
    (2, 'SKIPPED', 'Omitida');

-- =========== PERFORMED_SETS ===========
-- Una serie por (sesión, ejercicio del día, número): el PUT crea o reemplaza esa fila (idempotente).
-- routine_exercise_id apunta al ejercicio planificado; que pertenezca al día de la sesión lo controla el service.
-- Las CHECK de DONE y SKIPPED son red de seguridad: la regla de negocio está en el service y en el body.
-- Ninguna clave foránea tiene cascada: una serie impide quitar su ejercicio de la rutina (RoutineHasPerformedSets).
CREATE TABLE performed_sets (
    id                  uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    training_session_id uuid         NOT NULL REFERENCES training_sessions (id),
    routine_exercise_id uuid         NOT NULL REFERENCES routine_exercises (id),
    set_number          smallint     NOT NULL CONSTRAINT ck_performed_sets_set_number CHECK (set_number > 0),
    status_id           smallint     NOT NULL REFERENCES set_statuses (id),
    weight_kg           numeric(6,2) CONSTRAINT ck_performed_sets_weight CHECK (weight_kg >= 0),
    reps                smallint     CONSTRAINT ck_performed_sets_reps CHECK (reps > 0),
    rpe                 smallint     CONSTRAINT ck_performed_sets_rpe CHECK (rpe BETWEEN 1 AND 10),
    skip_reason         varchar(200),
    CONSTRAINT ux_performed_sets_session_exercise_set UNIQUE (training_session_id, routine_exercise_id, set_number),
    CONSTRAINT ck_performed_sets_done CHECK (
        status_id <> 1 OR (weight_kg IS NOT NULL AND reps IS NOT NULL AND skip_reason IS NULL)),
    CONSTRAINT ck_performed_sets_skipped CHECK (
        status_id <> 2 OR (weight_kg IS NULL AND reps IS NULL AND rpe IS NULL AND skip_reason IS NOT NULL))
);

-- Clave foránea y consulta de "¿tiene series este ejercicio?" (la usa el checker de la rutina)
CREATE INDEX ix_performed_sets_routine_exercise ON performed_sets (routine_exercise_id);
