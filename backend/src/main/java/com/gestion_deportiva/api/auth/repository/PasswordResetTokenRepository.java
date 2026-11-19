package com.gestion_deportiva.api.auth.repository;

import com.gestion_deportiva.api.auth.model.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {

    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    // Un pedido nuevo o un cambio de contraseña invalida los enlaces anteriores sin usar. Los usados quedan como
    // registro. Requiere estar dentro de una transacción
    @Modifying
    @Query("delete from PasswordResetToken t where t.user.id = :userId and t.usedAt is null")
    int deleteUnusedByUserId(@Param("userId") UUID userId);

    // Reclamo atómico del token: si dos requests usan el mismo enlace a la vez, solo una obtiene 1
    @Modifying
    @Query("update PasswordResetToken t set t.usedAt = :now where t.id = :id and t.usedAt is null")
    int markUsed(@Param("id") UUID id, @Param("now") Instant now);
}
