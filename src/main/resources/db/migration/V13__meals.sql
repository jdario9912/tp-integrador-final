-- =====================================================================
-- V13 · Registro de comidas (US-23)
-- Tablas: meal_types, meals, meal_items
-- photo_path queda nulable para la foto de la ola 2 (US-28); no se mapea en la entidad hasta entonces.
-- Los "code" de meal_types deben coincidir con el enum MealType y los "id" son fijos (el converter guarda el id).
-- =====================================================================

-- =========== MEAL_TYPES (catálogo) ===========
CREATE TABLE meal_types (
    id    smallint    PRIMARY KEY,
    code  varchar(30) NOT NULL UNIQUE,
    name  varchar(50) NOT NULL
);

INSERT INTO meal_types (id, code, name) VALUES
    (1, 'BREAKFAST',    'Desayuno'),
    (2, 'LUNCH',        'Almuerzo'),
    (3, 'SNACK',        'Merienda'),
    (4, 'DINNER',       'Cena'),
    (5, 'COLLATION',    'Colación'),
    (6, 'PRE_WORKOUT',  'Pre-entrenamiento'),
    (7, 'POST_WORKOUT', 'Post-entrenamiento');

-- =========== MEALS ===========
-- Una comida del atleta en un día. Sin unicidad por día ni por tipo (puede haber dos colaciones).
-- La regla "descripción o al menos un ítem" no se puede expresar acá sin un trigger: la valida la aplicación.
-- Las calorías no se guardan: se calculan a partir de los ítems.
CREATE TABLE meals (
    id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id    uuid          NOT NULL REFERENCES athletes (user_id),
    eaten_on      date          NOT NULL,
    meal_type_id  smallint      NOT NULL REFERENCES meal_types (id),
    description   varchar(500)  CONSTRAINT ck_meals_description CHECK (description IS NULL OR btrim(description) <> ''),
    photo_path    varchar(500),
    created_at    timestamptz   NOT NULL DEFAULT now(),
    updated_at    timestamptz   NOT NULL DEFAULT now()
);

-- Listado del día por atleta (empieza por athlete_id, cubre también la búsqueda del atleta)
CREATE INDEX ix_meals_athlete_eaten_on ON meals (athlete_id, eaten_on);

-- =========== MEAL_ITEMS ===========
-- Ítems de una comida, con la copia del alimento al momento de cargarlo (ref_* y food_name).
-- ON DELETE CASCADE: al borrar la comida se borran sus ítems. Los alimentos no tienen borrado (US-39),
-- así que la FK a foods no necesita cascada.
CREATE TABLE meal_items (
    id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_id             uuid          NOT NULL REFERENCES meals (id) ON DELETE CASCADE,
    sort_order          smallint      NOT NULL CONSTRAINT ck_meal_items_sort_order CHECK (sort_order >= 0),
    food_id             uuid          NOT NULL REFERENCES foods (id),
    food_name           varchar(100)  NOT NULL CONSTRAINT ck_meal_items_food_name CHECK (btrim(food_name) <> ''),
    quantity_g          numeric(7, 2) NOT NULL CONSTRAINT ck_meal_items_quantity CHECK (quantity_g > 0),
    ref_portion_g       numeric(7, 2) NOT NULL CONSTRAINT ck_meal_items_ref_portion CHECK (ref_portion_g > 0),
    ref_calories_kcal   numeric(7, 2) NOT NULL CONSTRAINT ck_meal_items_ref_calories CHECK (ref_calories_kcal >= 0),
    ref_protein_g       numeric(7, 2) NOT NULL CONSTRAINT ck_meal_items_ref_protein CHECK (ref_protein_g >= 0),
    ref_carbs_g         numeric(7, 2) NOT NULL CONSTRAINT ck_meal_items_ref_carbs CHECK (ref_carbs_g >= 0),
    ref_fat_g           numeric(7, 2) NOT NULL CONSTRAINT ck_meal_items_ref_fat CHECK (ref_fat_g >= 0),
    -- Diferida: al editar una comida, la aplicación inserta los ítems nuevos antes de borrar los anteriores
    -- (mismo meal_id y sort_order). La comprobación se hace al confirmar la transacción, cuando ya no quedan los viejos
    CONSTRAINT uq_meal_items_order UNIQUE (meal_id, sort_order) DEFERRABLE INITIALLY DEFERRED
);

-- Búsqueda por alimento (y verificación de la FK)
CREATE INDEX ix_meal_items_food ON meal_items (food_id);
