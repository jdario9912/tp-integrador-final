-- =====================================================================
-- V4 · Rutinas del entrenador (US-13)
-- Tablas: routines
-- Los días y ejercicios de la rutina (US-14) y las asignaciones (US-16)
-- llegan en migraciones posteriores.
-- =====================================================================

-- =========== ROUTINES ===========
-- is_template = plantilla reutilizable para distintos atletas
CREATE TABLE routines (
    id             uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id       uuid         NOT NULL REFERENCES coaches (user_id),
    name           varchar(100) NOT NULL CONSTRAINT ck_routines_name CHECK (btrim(name) <> ''),
    description    varchar(500),
    goal           varchar(100),
    days_per_week  smallint     CONSTRAINT ck_routines_days_per_week CHECK (days_per_week BETWEEN 1 AND 7),
    duration_weeks smallint     CONSTRAINT ck_routines_duration_weeks CHECK (duration_weeks BETWEEN 1 AND 52),
    is_template    boolean      NOT NULL DEFAULT false,
    created_at     timestamptz  NOT NULL DEFAULT now(),
    updated_at     timestamptz  NOT NULL DEFAULT now()
);

-- Nombre único entre las rutinas del entrenador, sin importar mayúsculas.
-- El índice empieza por coach_id, así que también cubre el listado "mis rutinas"
CREATE UNIQUE INDEX ux_routines_coach_name ON routines (coach_id, lower(name));
