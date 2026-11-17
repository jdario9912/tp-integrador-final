-- =====================================================================
-- V16 · Revisar alimentación del atleta (US-25)
-- Tabla: meals (columnas reviewed_at y coach_observation)
-- reviewed_at es el último momento en que el entrenador revisó la comida; null si nunca la revisó o si el atleta la
-- editó después. coach_observation es el comentario del entrenador (opcional, hasta 1000 caracteres): siempre
-- pertenece a una revisión. Revisar de nuevo reemplaza las dos columnas.
-- El listado por rango usa el índice ix_meals_athlete_eaten_on de V13.
-- =====================================================================

ALTER TABLE meals
    ADD COLUMN reviewed_at        timestamptz   NULL,
    ADD COLUMN coach_observation  varchar(1000) NULL;

-- Un comentario siempre tiene una revisión
ALTER TABLE meals ADD CONSTRAINT ck_meals_coach_observation
    CHECK (coach_observation IS NULL OR reviewed_at IS NOT NULL);
