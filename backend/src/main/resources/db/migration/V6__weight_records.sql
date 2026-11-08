-- =====================================================================
-- V6 · Registros de peso corporal del atleta (US-26)
-- Tablas: weight_records
-- La V5 queda reservada para US-14 (días y ejercicios de la rutina).
-- =====================================================================

-- =========== WEIGHT_RECORDS ===========
-- Un registro por atleta y por día (recorded_on = el "date" de la API).
-- No se borran: un registro equivocado se corrige
CREATE TABLE weight_records (
    id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id  uuid          NOT NULL REFERENCES athletes (user_id),
    recorded_on date          NOT NULL,
    weight_kg   numeric(5, 2) NOT NULL CONSTRAINT ck_weight_records_weight CHECK (weight_kg BETWEEN 20 AND 300),
    -- Sin dato = NULL, nunca vacío ni solo espacios (la aplicación lo recorta)
    comment     varchar(500)  CONSTRAINT ck_weight_records_comment CHECK (btrim(comment) <> ''),
    created_at  timestamptz   NOT NULL DEFAULT now(),
    updated_at  timestamptz   NOT NULL DEFAULT now()
);

-- Uno por día. Empieza por athlete_id, así que también cubre el listado del atleta
-- por rango de fechas y del más reciente al más antiguo
CREATE UNIQUE INDEX ux_weight_records_athlete_recorded_on ON weight_records (athlete_id, recorded_on);
