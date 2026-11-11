-- =====================================================================
-- V9 · Catálogo de alimentos (US-39)
-- Tabla: foods
-- Catálogo global: sin autor, lo editan los entrenadores y lo consultan
-- los dos roles. Los valores nutricionales son por porción de referencia.
-- =====================================================================

CREATE TABLE foods (
    id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    name                varchar(100)  NOT NULL CONSTRAINT ck_foods_name CHECK (btrim(name) <> ''),
    reference_portion_g numeric(7, 2) NOT NULL CONSTRAINT ck_foods_reference_portion CHECK (reference_portion_g > 0 AND reference_portion_g <= 10000),
    calories_kcal       numeric(7, 2) NOT NULL CONSTRAINT ck_foods_calories CHECK (calories_kcal BETWEEN 0 AND 10000),
    protein_g           numeric(7, 2) NOT NULL CONSTRAINT ck_foods_protein CHECK (protein_g BETWEEN 0 AND 10000),
    carbs_g             numeric(7, 2) NOT NULL CONSTRAINT ck_foods_carbs CHECK (carbs_g BETWEEN 0 AND 10000),
    fat_g               numeric(7, 2) NOT NULL CONSTRAINT ck_foods_fat CHECK (fat_g BETWEEN 0 AND 10000),
    created_at          timestamptz   NOT NULL DEFAULT now(),
    updated_at          timestamptz   NOT NULL DEFAULT now()
);

-- Nombre único en todo el catálogo sin importar mayúsculas
CREATE UNIQUE INDEX ux_foods_name ON foods (lower(name));

-- Alimentos precargados, valores aproximados por 100 g
INSERT INTO foods (name, reference_portion_g, calories_kcal, protein_g, carbs_g, fat_g) VALUES
    ('Pechuga de pollo cocida',   100, 165,  31,   0,    3.6),
    ('Carne vacuna magra cocida', 100, 217,  26,   0,   12),
    ('Lomo de cerdo cocido',      100, 242,  27,   0,   14),
    ('Atún al natural',           100, 116,  26,   0,    1),
    ('Merluza cocida',            100,  90,  19,   0,    1.3),
    ('Salmón cocido',             100, 206,  22,   0,   12),
    ('Huevo entero',              100, 155,  13,   1.1, 11),
    ('Clara de huevo',            100,  52,  11,   0.7,  0.2),
    ('Leche descremada',          100,  35,   3.4, 5,    0.1),
    ('Yogur natural descremado',  100,  56,   5.7, 7.7,  0.2),
    ('Queso fresco',              100, 264,  18,   3,   20),
    ('Arroz blanco cocido',       100, 130,   2.7, 28,   0.3),
    ('Arroz integral cocido',     100, 112,   2.3, 24,   0.8),
    ('Fideos cocidos',            100, 158,   5.8, 31,   0.9),
    ('Avena',                     100, 389,  17,  66,    7),
    ('Pan blanco',                100, 265,   9,  49,    3.2),
    ('Pan integral',              100, 247,  13,  41,    3.4),
    ('Papa hervida',              100,  87,   1.9, 20,   0.1),
    ('Batata hervida',            100,  76,   1.4, 18,   0.1),
    ('Lentejas cocidas',          100, 116,   9,  20,    0.4),
    ('Garbanzos cocidos',         100, 164,   8.9, 27,   2.6),
    ('Banana',                    100,  89,   1.1, 23,   0.3),
    ('Manzana',                   100,  52,   0.3, 14,   0.2),
    ('Naranja',                   100,  47,   0.9, 12,   0.1),
    ('Brócoli cocido',            100,  35,   2.4,  7,   0.4),
    ('Lechuga',                   100,  15,   1.4,  2.9, 0.2),
    ('Tomate',                    100,  18,   0.9,  3.9, 0.2),
    ('Palta',                     100, 160,   2,   9,   15),
    ('Aceite de oliva',           100, 884,   0,   0,  100),
    ('Almendras',                 100, 579,  21,  22,   50),
    ('Mantequilla de maní',       100, 588,  25,  20,   50);
