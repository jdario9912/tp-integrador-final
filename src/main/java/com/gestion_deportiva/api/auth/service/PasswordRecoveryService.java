package com.gestion_deportiva.api.auth.service;

import com.gestion_deportiva.api.auth.dto.PasswordRecoveryRequest;
import com.gestion_deportiva.api.auth.dto.PasswordResetRequest;
import com.gestion_deportiva.api.auth.exception.InvalidPasswordResetTokenException;
import com.gestion_deportiva.api.auth.model.PasswordResetToken;
import com.gestion_deportiva.api.auth.repository.PasswordResetTokenRepository;
import com.gestion_deportiva.api.auth.repository.RefreshTokenRepository;
import com.gestion_deportiva.api.config.PasswordResetProperties;
import com.gestion_deportiva.api.user.model.User;
import com.gestion_deportiva.api.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.Optional;

// Recuperación de contraseña (US-44, SEC-02). El token es opaco (256 bits, RefreshTokenGenerator) y en la base solo
// queda su hash. Un pedido nuevo invalida los enlaces anteriores sin usar
@Slf4j
@Service
@RequiredArgsConstructor
public class PasswordRecoveryService {

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final RefreshTokenGenerator tokenGenerator;
    private final PasswordResetMailer mailer;
    private final PasswordEncoder passwordEncoder;
    private final PasswordResetProperties properties;
    private final Clock clock;

    // Email inexistente o cuenta desactivada: no hace nada y el controller responde lo mismo que con uno válido (no
    // revela qué emails están registrados). El email se manda dentro de la transacción: si falla, la
    // PasswordResetMailException hace rollback y el token no queda guardado (no hay un enlace que nadie recibió)
    @Transactional
    public void requestRecovery(PasswordRecoveryRequest request) {
        Optional<User> found = userRepository.findByEmail(User.normalizeEmail(request.email()));
        if (found.isEmpty() || !found.get().isActive()) {
            log.info("Recuperación de contraseña pedida para un email no registrado o una cuenta desactivada");
            return;
        }

        User user = found.get();
        passwordResetTokenRepository.deleteUnusedByUserId(user.getId());

        String token = tokenGenerator.generate();
        Instant expiresAt = clock.instant().plus(properties.tokenTtl());
        passwordResetTokenRepository.save(new PasswordResetToken(user, tokenGenerator.hash(token), expiresAt));

        // El token es base64url: no hace falta codificarlo para la query
        mailer.send(user, properties.resetUrl() + "?token=" + token, properties.tokenTtl());
        log.info("Enlace de recuperación de contraseña enviado al usuario {}", user.getId());
    }

    // Token inexistente, vencido o usado: 400. Con uno válido se cambia la contraseña, se marca el token como usado,
    // se descartan los demás enlaces y se revocan las sesiones abiertas (hay que volver a iniciar sesión)
    @Transactional
    public void resetPassword(PasswordResetRequest request) {
        Instant now = clock.instant();
        PasswordResetToken stored = passwordResetTokenRepository
                .findByTokenHash(tokenGenerator.hash(request.token()))
                .filter(token -> token.isUsable(now))
                .orElseThrow(() -> {
                    log.warn("Cambio de contraseña rechazado: token inexistente, vencido o usado");
                    return new InvalidPasswordResetTokenException();
                });

        // Reclamo atómico: si otra request usó el mismo enlace al mismo tiempo, el update no afecta ninguna fila
        if (passwordResetTokenRepository.markUsed(stored.getId(), now) == 0) {
            log.warn("Cambio de contraseña rechazado: el token ya fue usado");
            throw new InvalidPasswordResetTokenException();
        }

        User user = stored.getUser();
        user.changePassword(passwordEncoder.encode(request.newPassword()));
        passwordResetTokenRepository.deleteUnusedByUserId(user.getId());
        int revoked = refreshTokenRepository.revokeAllByUserId(user.getId());
        log.info("Contraseña restablecida del usuario {}: {} sesiones revocadas", user.getId(), revoked);
    }
}
