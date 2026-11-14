-- =====================================================================
-- V12 · Fotos de progreso (US-28)
-- Tablas: photo_types, progress_photos
-- Los "code" de photo_types deben coincidir con el enum ProgressPhotoType
-- y los "id" son fijos (el converter guarda el id).
-- =====================================================================

-- =========== CATÁLOGO ===========
CREATE TABLE photo_types (
    id   smallint    PRIMARY KEY,
    code varchar(20) NOT NULL UNIQUE,
    name varchar(50) NOT NULL
);

INSERT INTO photo_types (id, code, name) VALUES
    (1, 'FRONT', 'Frontal'),
    (2, 'SIDE',  'Lateral'),
    (3, 'BACK',  'Espalda');

-- =========== PROGRESS_PHOTOS ===========
-- storage_path es la ruta del objeto en el bucket privado; nunca sale en la API.
-- Se inserta solo después de subir el objeto: no puede haber fila sin objeto.
-- Sin ON DELETE CASCADE: los atletas se dan de baja lógicamente y no se borran.
CREATE TABLE progress_photos (
    id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id   uuid         NOT NULL REFERENCES athletes (user_id),
    type_id      smallint     NOT NULL REFERENCES photo_types (id),
    taken_on     date         NOT NULL,
    storage_path varchar(255) NOT NULL CONSTRAINT ck_progress_photos_storage_path CHECK (btrim(storage_path) <> ''),
    created_at   timestamptz  NOT NULL DEFAULT now()
);

-- Una ruta de objeto es única (lleva un uuid)
CREATE UNIQUE INDEX ux_progress_photos_storage_path ON progress_photos (storage_path);

-- Listado cronológico por atleta (taken_on, created_at, id); la FK del atleta queda cubierta por el mismo índice
CREATE INDEX ix_progress_photos_athlete_taken ON progress_photos (athlete_id, taken_on, created_at, id);
