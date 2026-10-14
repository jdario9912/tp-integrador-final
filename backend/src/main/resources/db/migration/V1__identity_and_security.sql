-- =====================================================================
-- V1 · Identidad, roles y acceso (US-33)
-- Tablas: roles, sexes, experience_levels, athlete_statuses,
--         users, coaches, athletes, refresh_tokens
-- Los "code" de los catálogos deben coincidir con los enums de Java
-- y los "id" son fijos (el converter guarda el id).
-- =====================================================================

-- =========== CATÁLOGOS ===========
CREATE TABLE roles (
    id          smallint     PRIMARY KEY,
    code        varchar(30)  NOT NULL UNIQUE,
    name        varchar(50)  NOT NULL,
    description varchar(255)
);

INSERT INTO roles (id, code, name, description) VALUES
    (1, 'COACH',   'Entrenador', 'Gestiona atletas, rutinas y seguimiento'),
    (2, 'ATHLETE', 'Atleta',     'Registra entrenamientos, comidas y progreso');

CREATE TABLE sexes (
    id   smallint    PRIMARY KEY,
    code varchar(30) NOT NULL UNIQUE,
    name varchar(50) NOT NULL
);

INSERT INTO sexes (id, code, name) VALUES
    (1, 'MALE',   'Masculino'),
    (2, 'FEMALE', 'Femenino'),
    (3, 'OTHER',  'Otro');

CREATE TABLE experience_levels (
    id         smallint    PRIMARY KEY,
    code       varchar(30) NOT NULL UNIQUE,
    name       varchar(50) NOT NULL,
    sort_order smallint    NOT NULL UNIQUE
);

INSERT INTO experience_levels (id, code, name, sort_order) VALUES
    (1, 'BEGINNER',     'Principiante', 1),
    (2, 'INTERMEDIATE', 'Intermedio',   2),
    (3, 'ADVANCED',     'Avanzado',     3);

CREATE TABLE athlete_statuses (
    id                 smallint    PRIMARY KEY,
    code               varchar(30) NOT NULL UNIQUE,
    name               varchar(50) NOT NULL,
    requires_attention boolean     NOT NULL
);

INSERT INTO athlete_statuses (id, code, name, requires_attention) VALUES
    (1, 'ACTIVE',       'Activo',            false),
    (2, 'NEEDS_REVIEW', 'Necesita revisión', true),
    (3, 'NO_ROUTINE',   'Sin rutina',        true),
    (4, 'NO_ACTIVITY',  'Sin actividad',     true),
    (5, 'INACTIVE',     'Inactivo',          false);

-- =========== USERS (superclase, herencia JOINED) ===========
CREATE TABLE users (
    id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id       smallint     NOT NULL REFERENCES roles (id),
    first_name    varchar(100) NOT NULL,
    last_name     varchar(100) NOT NULL,
    email         varchar(255) NOT NULL,
    password_hash varchar(100) NOT NULL,
    phone         varchar(30),
    active        boolean      NOT NULL DEFAULT true,
    created_at    timestamptz  NOT NULL DEFAULT now(),
    updated_at    timestamptz  NOT NULL DEFAULT now(),
    last_login_at timestamptz
);

-- Email único sin importar mayúsculas: "Juan@x.com" y "juan@x.com" chocan
CREATE UNIQUE INDEX ux_users_email ON users (lower(email));
CREATE INDEX ix_users_role ON users (role_id);

-- =========== COACHES (PK = FK a users) ===========
CREATE TABLE coaches (
    user_id        uuid          PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    specialty      varchar(100),
    license_number varchar(50),
    bio            varchar(1000)
);

-- =========== ATHLETES (PK = FK a users) ===========
CREATE TABLE athletes (
    user_id             uuid          PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    coach_id            uuid          REFERENCES coaches (user_id),
    sex_id              smallint      REFERENCES sexes (id),
    experience_level_id smallint      REFERENCES experience_levels (id),
    status_id           smallint      NOT NULL DEFAULT 1 REFERENCES athlete_statuses (id),
    birth_date          date,
    height_cm           numeric(5, 2) CONSTRAINT ck_athletes_height CHECK (height_cm > 0),
    initial_weight_kg   numeric(5, 2) CONSTRAINT ck_athletes_initial_weight CHECK (initial_weight_kg > 0),
    goal                varchar(255),
    injuries            varchar(500),
    limitations         varchar(500),
    available_days      smallint      CONSTRAINT ck_athletes_available_days CHECK (available_days BETWEEN 1 AND 7),
    start_date          date
);

CREATE INDEX ix_athletes_coach  ON athletes (coach_id);
CREATE INDEX ix_athletes_status ON athletes (status_id);

-- =========== REFRESH TOKENS ===========
-- Se guarda el hash SHA-256 (hex, 64 caracteres) del token, nunca el token en claro.
CREATE TABLE refresh_tokens (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash char(64)    NOT NULL UNIQUE,
    issued_at  timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    revoked    boolean     NOT NULL DEFAULT false,
    CONSTRAINT ck_refresh_tokens_expiration CHECK (expires_at > issued_at)
);

CREATE INDEX ix_refresh_tokens_user ON refresh_tokens (user_id);
