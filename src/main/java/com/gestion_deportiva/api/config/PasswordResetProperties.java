package com.gestion_deportiva.api.config;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.time.Duration;

// Recuperación de contraseña (app.security.password-reset.*, US-44). resetUrl es la página del front que recibe el
// token (se le agrega ?token=...); mailFrom, el remitente del email. Si algo falta o es inválido, la app no arranca
@Validated
@ConfigurationProperties(prefix = "app.security.password-reset")
public record PasswordResetProperties(
        @NotNull Duration tokenTtl,
        @NotBlank String resetUrl,
        @NotBlank String mailFrom
) {

    public PasswordResetProperties {
        if (tokenTtl != null && (tokenTtl.isZero() || tokenTtl.isNegative())) {
            throw new IllegalArgumentException("app.security.password-reset.token-ttl debe ser mayor a cero");
        }
        if (resetUrl != null && !resetUrl.matches("https?://\\S+")) {
            throw new IllegalArgumentException("app.security.password-reset.reset-url (PASSWORD_RESET_URL) debe ser "
                    + "una URL http(s), ej. http://localhost:5173/reset-password");
        }
    }
}
