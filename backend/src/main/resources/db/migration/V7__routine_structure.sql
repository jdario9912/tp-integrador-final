-- =====================================================================
-- V7 · Estructura de la rutina: días y ejercicios (US-14)
-- Tablas: routine_days, routine_exercises
-- Las columnas siguen el UML (RoutineDay, RoutineExercise).
-- =====================================================================

-- =========== ROUTINE_DAYS ===========
-- day_number = posición del día dentro de la rutina (desde 1)
CREATE TABLE routine_days (
    id         uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_id uuid         NOT NULL REFERENCES routines (id) ON DELETE CASCADE,
    day_number smallint     NOT NULL CONSTRAINT ck_routine_days_day_number CHECK (day_number > 0),
    name       varchar(100) NOT NULL CONSTRAINT ck_routine_days_name CHECK (btrim(name) <> ''),
    -- Diferida: al reordenar, dos días intercambian su número dentro de la misma transacción
    CONSTRAINT ux_routine_days_routine_day_number UNIQUE (routine_id, day_number) DEFERRABLE INITIALLY DEFERRED
);

-- =========== ROUTINE_EXERCISES ===========
-- sort_order = posición del ejercicio dentro del día (desde 0).
-- rir_rpe = "RIR n" (0 a 10) o "RPE n" (1 a 10, admite .5); el formato lo valida la API
CREATE TABLE routine_exercises (
    id                    uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_day_id        uuid         NOT NULL REFERENCES routine_days (id) ON DELETE CASCADE,
    exercise_id           uuid         NOT NULL REFERENCES exercises (id),
    sort_order            smallint     NOT NULL CONSTRAINT ck_routine_exercises_sort_order CHECK (sort_order >= 0),
    sets                  smallint     NOT NULL CONSTRAINT ck_routine_exercises_sets CHECK (sets > 0),
    reps                  smallint     NOT NULL CONSTRAINT ck_routine_exercises_reps CHECK (reps > 0),
    recommended_weight_kg numeric(6,2) CONSTRAINT ck_routine_exercises_weight CHECK (recommended_weight_kg >= 0),
    rest_seconds          smallint     CONSTRAINT ck_routine_exercises_rest CHECK (rest_seconds >= 0),
    rir_rpe               varchar(10),
    technique_note        varchar(500),
    CONSTRAINT ux_routine_exercises_day_sort_order UNIQUE (routine_day_id, sort_order) DEFERRABLE INITIALLY DEFERRED
);

-- Consultas por ejercicio del catálogo (por ejemplo, saber en qué rutinas se usa)
CREATE INDEX ix_routine_exercises_exercise ON routine_exercises (exercise_id);
