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

    // Cierre de sesión en todos los dispositivos (US-03). Requiere estar dentro de una transacción.
    @Modifying
    @Query("update RefreshToken t set t.revoked = true where t.user.id = :userId and t.revoked = false")
    int revokeAllByUserId(@Param("userId") UUID userId);
}
