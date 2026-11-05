-- =====================================================================
-- V3 · Catálogo de ejercicios y grupos musculares (US-38)
-- Tablas: muscle_groups, exercises
-- Los "code" de muscle_groups deben coincidir con el enum MuscleGroup
-- y los "id" son fijos (el converter guarda el id).
-- =====================================================================

-- =========== CATÁLOGO ===========
CREATE TABLE muscle_groups (
    id     smallint    PRIMARY KEY,
    code   varchar(30) NOT NULL UNIQUE,
    name   varchar(50) NOT NULL,
    -- Agrupa las opciones en el front; coincide con el enum MuscleRegion
    region varchar(10) NOT NULL CONSTRAINT ck_muscle_groups_region CHECK (region IN ('UPPER', 'CORE', 'LOWER', 'FULL'))
);

INSERT INTO muscle_groups (id, code, name, region) VALUES
    (1,  'CHEST',      'Pecho',           'UPPER'),
    (2,  'BACK',       'Espalda',         'UPPER'),
    (3,  'SHOULDERS',  'Hombros',         'UPPER'),
    (4,  'BICEPS',     'Bíceps',          'UPPER'),
    (5,  'TRICEPS',    'Tríceps',         'UPPER'),
    (6,  'FOREARMS',   'Antebrazos',      'UPPER'),
    (7,  'ABS',        'Abdominales',     'CORE'),
    (8,  'QUADRICEPS', 'Cuádriceps',      'LOWER'),
    (9,  'HAMSTRINGS', 'Isquiotibiales',  'LOWER'),
    (10, 'GLUTES',     'Glúteos',         'LOWER'),
    (11, 'CALVES',     'Gemelos',         'LOWER'),
    (12, 'FULL_BODY',  'Cuerpo completo', 'FULL');

-- =========== EXERCISES ===========
-- created_by NULL = ejercicio del sistema (global, solo lectura). Con valor = ejercicio del entrenador
CREATE TABLE exercises (
    id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    muscle_group_id smallint     NOT NULL REFERENCES muscle_groups (id),
    created_by      uuid         REFERENCES coaches (user_id),
    name            varchar(100) NOT NULL CONSTRAINT ck_exercises_name CHECK (btrim(name) <> ''),
    description     varchar(500),
    video_url       varchar(500),
    created_at      timestamptz  NOT NULL DEFAULT now(),
    updated_at      timestamptz  NOT NULL DEFAULT now(),
    -- Baja lógica: las rutinas que ya lo usan lo siguen referenciando
    deleted_at      timestamptz
);

-- Nombre único sin importar mayúsculas: por entrenador y entre los globales, solo entre los no eliminados
CREATE UNIQUE INDEX ux_exercises_coach_name ON exercises (created_by, lower(name))
    WHERE deleted_at IS NULL AND created_by IS NOT NULL;
CREATE UNIQUE INDEX ux_exercises_global_name ON exercises (lower(name))
    WHERE deleted_at IS NULL AND created_by IS NULL;
CREATE INDEX ix_exercises_created_by   ON exercises (created_by);
CREATE INDEX ix_exercises_muscle_group ON exercises (muscle_group_id);

-- Ejercicios globales precargados
INSERT INTO exercises (muscle_group_id, name, description) VALUES
    (1,  'Press de banca con barra',     'Acostado en banco plano, bajar la barra al pecho y empujar'),
    (1,  'Press inclinado con mancuernas', 'Banco a 30-45°, empujar las mancuernas sobre el pecho'),
    (1,  'Aperturas con mancuernas',     'Banco plano, abrir los brazos con codos semiflexionados'),
    (1,  'Flexiones de brazos',          'Cuerpo alineado, bajar el pecho al piso y empujar'),
    (2,  'Dominadas',                    'Colgado de la barra, subir hasta pasar el mentón'),
    (2,  'Remo con barra',               'Torso inclinado, llevar la barra al abdomen'),
    (2,  'Jalón al pecho',               'En polea alta, llevar la barra al pecho'),
    (2,  'Peso muerto',                  'Levantar la barra del piso con la espalda neutra'),
    (3,  'Press militar con barra',      'De pie, empujar la barra por encima de la cabeza'),
    (3,  'Elevaciones laterales',        'Elevar las mancuernas a los costados hasta la altura de los hombros'),
    (3,  'Pájaros con mancuernas',       'Torso inclinado, abrir los brazos para el deltoides posterior'),
    (4,  'Curl de bíceps con barra',     'De pie, flexionar los codos sin balancear el torso'),
    (4,  'Curl martillo',                'Mancuernas con agarre neutro'),
    (5,  'Fondos en paralelas',          'Bajar flexionando los codos y empujar'),
    (5,  'Extensión de tríceps en polea', 'Codos fijos, extender los brazos hacia abajo'),
    (5,  'Press francés',                'Acostado, bajar la barra hacia la frente flexionando los codos'),
    (6,  'Curl de muñeca',               'Antebrazos apoyados, flexionar las muñecas'),
    (6,  'Paseo del granjero',           'Caminar sosteniendo peso en cada mano'),
    (7,  'Plancha',                      'Sostener el cuerpo alineado apoyado en antebrazos'),
    (7,  'Crunch abdominal',             'Acostado, despegar los hombros del piso'),
    (7,  'Elevación de piernas colgado', 'Colgado de la barra, elevar las piernas'),
    (8,  'Sentadilla con barra',         'Barra en la espalda, bajar hasta paralelo y subir'),
    (8,  'Prensa de piernas',            'En máquina, empujar la plataforma con las piernas'),
    (8,  'Zancadas',                     'Paso largo y bajar la rodilla trasera hacia el piso'),
    (8,  'Extensión de cuádriceps',      'En máquina, extender las rodillas'),
    (9,  'Peso muerto rumano',           'Bajar la barra con las rodillas semiflexionadas'),
    (9,  'Curl femoral acostado',        'En máquina, flexionar las rodillas'),
    (10, 'Hip thrust',                   'Espalda apoyada en banco, elevar la cadera con la barra'),
    (10, 'Patada de glúteo en polea',    'Extender la cadera hacia atrás'),
    (11, 'Elevación de talones de pie',  'Subir en puntas de pie con peso'),
    (11, 'Elevación de talones sentado', 'En máquina, con las rodillas flexionadas'),
    (12, 'Burpees',                      'Sentadilla, plancha, flexión y salto'),
    (12, 'Arranque con kettlebell',      'Llevar la kettlebell desde entre las piernas hasta arriba');
