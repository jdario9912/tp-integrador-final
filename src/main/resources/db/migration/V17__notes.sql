-- =====================================================================
-- V17 · Notas del entrenador sobre el atleta (US-46)
-- Tablas: note_types, notes
-- Los "code" de note_types deben coincidir con el enum NoteType
-- y los "id" son fijos (el converter guarda el id).
-- =====================================================================

-- =========== CATÁLOGO ===========
-- visible_to_athlete decide si el atleta puede ver la nota: las privadas nunca salen en sus respuestas
CREATE TABLE note_types (
    id                 smallint    PRIMARY KEY,
    code               varchar(30) NOT NULL UNIQUE,
    name               varchar(50) NOT NULL,
    visible_to_athlete boolean     NOT NULL
);

INSERT INTO note_types (id, code, name, visible_to_athlete) VALUES
    (1, 'PRIVATE',            'Privada',             false),
    (2, 'VISIBLE_TO_ATHLETE', 'Visible para el atleta', true);

-- =========== NOTES ===========
-- author_id es el entrenador que la escribió. read_at queda en null hasta que el atleta la marca como leída
-- (solo las visibles). Sin ON DELETE CASCADE: los usuarios se dan de baja lógicamente y no se borran
CREATE TABLE notes (
    id           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id   uuid          NOT NULL REFERENCES athletes (user_id),
    author_id    uuid          NOT NULL REFERENCES coaches (user_id),
    note_type_id smallint      NOT NULL REFERENCES note_types (id),
    title        varchar(150)  NOT NULL CONSTRAINT ck_notes_title CHECK (btrim(title) <> ''),
    content      varchar(2000) NOT NULL CONSTRAINT ck_notes_content CHECK (btrim(content) <> ''),
    created_at   timestamptz   NOT NULL DEFAULT now(),
    read_at      timestamptz,
    -- Solo una nota visible puede estar leída (la privada el atleta no la ve)
    CONSTRAINT ck_notes_read_at CHECK (read_at IS NULL OR note_type_id = 2)
);

-- Listado de las notas de un atleta, de la más reciente a la más antigua; cubre también la FK del atleta
CREATE INDEX ix_notes_athlete_created ON notes (athlete_id, created_at DESC, id);
CREATE INDEX ix_notes_author ON notes (author_id);
