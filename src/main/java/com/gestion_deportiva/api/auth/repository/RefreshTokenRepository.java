package com.gestion_deportiva.api.auth.repository;

import com.gestion_deportiva.api.auth.model.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    // Una sola sesión por usuario (US-02): al iniciar sesión o refrescar se borran los tokens anteriores.
    // Requiere estar dentro de una transacción.
    @Modifying
    @Query("delete from RefreshToken t where t.user.id = :userId")
    int deleteAllByUserId(@Param("userId") UUID userId);

    // Borrado que informa cuántas filas afectó: es el "reclamo" atómico del refresh. Si dos requests
    // usan el mismo token a la vez, solo una obtiene 1; la otra recibe 0 y se rechaza.
    @Modifying
    @Query("delete from RefreshToken t where t.id = :id")
    int deleteOne(@Param("id") UUID id);

    // Cierre de sesión en todos los dispositivos (US-03). Requiere estar dentro de una transacción.
    @Modifying
    @Query("update RefreshToken t set t.revoked = true where t.user.id = :userId and t.revoked = false")
    int revokeAllByUserId(@Param("userId") UUID userId);
}
