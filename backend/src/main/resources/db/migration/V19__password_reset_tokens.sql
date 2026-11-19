-- =====================================================================
-- V19 · Recuperación de contraseña (US-44)
-- Tabla: password_reset_tokens
-- =====================================================================

-- Se guarda el hash SHA-256 (64 caracteres hex) del token que viaja en el enlace del email, nunca el token en claro.
-- Un solo uso: used_at se completa al definir la nueva contraseña. Sin ON DELETE CASCADE: bajas lógicas
CREATE TABLE password_reset_tokens (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid        NOT NULL REFERENCES users (id),
    token_hash char(64)    NOT NULL,
    expires_at timestamptz NOT NULL,
    used_at    timestamptz
);

-- La búsqueda es por hash; un hash repetido no puede existir (256 bits aleatorios)
CREATE UNIQUE INDEX ux_password_reset_tokens_token_hash ON password_reset_tokens (token_hash);
CREATE INDEX ix_password_reset_tokens_user ON password_reset_tokens (user_id);
