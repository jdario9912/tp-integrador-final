-- =====================================================================
-- V2 · Baja lógica de usuarios (US-07: eliminar atleta)
-- Un usuario eliminado conserva su fila (y su historial), pero la aplicación
-- no lo ve más y su email queda libre para un alta nueva.
-- =====================================================================

ALTER TABLE users ADD COLUMN deleted_at timestamptz;

-- El email pasa a ser único solo entre los usuarios no eliminados
DROP INDEX ux_users_email;
CREATE UNIQUE INDEX ux_users_email ON users (lower(email)) WHERE deleted_at IS NULL;
