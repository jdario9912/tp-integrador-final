-- =====================================================================
-- V21 · Foto de perfil del usuario (US-48)
-- Columna nueva en users: la ruta del objeto en el bucket privado (null = sin foto).
-- La API nunca la muestra: responde una URL firmada (la arma el service en cada lectura).
-- =====================================================================

ALTER TABLE users
    ADD COLUMN profile_photo_path varchar(255),
    ADD CONSTRAINT ck_users_profile_photo_path CHECK (profile_photo_path IS NULL OR btrim(profile_photo_path) <> '');

-- Una ruta de objeto es única (lleva un uuid). Parcial: los usuarios sin foto no compiten por el índice
CREATE UNIQUE INDEX ux_users_profile_photo_path ON users (profile_photo_path) WHERE profile_photo_path IS NOT NULL;
