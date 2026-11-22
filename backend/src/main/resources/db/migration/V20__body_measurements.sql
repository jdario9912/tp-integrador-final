-- =====================================================================
-- V20 · Registro de medidas corporales (US-45)
-- Tablas: body_measurement_types, body_measurement_records, body_measurement_values
-- Los "code" de body_measurement_types deben coincidir con el enum BodyMeasurementType
-- y los "id" son fijos (el converter guarda el id). CatalogSchemaTest controla ambas cosas.
-- =====================================================================

-- =========== CATÁLOGO ===========
-- bilateral: se mide de los dos lados (la medida lleva side). min_value y max_value: rango válido inclusive
CREATE TABLE body_measurement_types (
    id        smallint     PRIMARY KEY,
    code      varchar(20)  NOT NULL UNIQUE,
    name      varchar(50)  NOT NULL,
    unit      varchar(5)   NOT NULL,
    bilateral boolean      NOT NULL,
    min_value numeric(5, 2) NOT NULL,
    max_value numeric(5, 2) NOT NULL,
    CONSTRAINT ck_body_measurement_types_range CHECK (min_value < max_value)
);

INSERT INTO body_measurement_types (id, code, name, unit, bilateral, min_value, max_value) VALUES
    (1, 'WAIST',    'Cintura',         'cm', false,  20,  300),
    (2, 'CHEST',    'Pecho',           'cm', false,  20,  300),
    (3, 'HIP',      'Cadera',          'cm', false,  20,  300),
    (4, 'ARM',      'Brazo',           'cm', true,    5,  100),
    (5, 'LEG',      'Pierna (muslo)',  'cm', true,   10,  150),
    (6, 'BODY_FAT', '% de grasa',      '%',  false,   1,   75);

-- =========== BODY_MEASUREMENT_RECORDS ===========
-- Un registro por atleta y por día (measured_on = el "date" de la API), como los de peso (V6).
-- No se borran: un registro equivocado se corrige. Sin ON DELETE CASCADE hacia el atleta: las bajas son lógicas
CREATE TABLE body_measurement_records (
    id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id  uuid          NOT NULL REFERENCES athletes (user_id),
    measured_on date          NOT NULL,
    -- Sin dato = NULL, nunca vacío ni solo espacios (la aplicación lo recorta)
    comment     varchar(500)  CONSTRAINT ck_body_measurement_records_comment CHECK (btrim(comment) <> ''),
    created_at  timestamptz   NOT NULL DEFAULT now(),
    updated_at  timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT ux_body_measurement_records_athlete_measured_on UNIQUE (athlete_id, measured_on)
);

-- Historial del atleta del más reciente al más antiguo
CREATE INDEX ix_body_measurement_records_athlete_measured ON body_measurement_records (athlete_id, measured_on DESC);

-- =========== BODY_MEASUREMENT_VALUES ===========
-- Una medida del registro. side: LEFT o RIGHT en las bilaterales, null en las demás. La regla "bilateral exige side"
-- la controla la aplicación (una CHECK no puede mirar el catálogo de otra tabla)
-- ON DELETE CASCADE: al borrar un registro se van sus medidas. Hoy no hay borrado de registros (US-45 no lo incluye);
-- el PUT reemplaza las medidas borrándolas a ellas, no al registro
CREATE TABLE body_measurement_values (
    id        uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id uuid          NOT NULL REFERENCES body_measurement_records (id) ON DELETE CASCADE,
    type_id   smallint      NOT NULL REFERENCES body_measurement_types (id),
    side      varchar(5),
    value     numeric(5, 2) NOT NULL CONSTRAINT ck_body_measurement_values_value CHECK (value > 0),
    CONSTRAINT ck_body_measurement_values_side CHECK (side IN ('LEFT', 'RIGHT')),
    -- Un tipo y un lado por registro. NULLS NOT DISTINCT: dos medidas sin lado del mismo tipo también chocan
    CONSTRAINT ux_body_measurement_values_record_type_side UNIQUE NULLS NOT DISTINCT (record_id, type_id, side)
);
