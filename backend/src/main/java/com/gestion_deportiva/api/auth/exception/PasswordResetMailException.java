package com.gestion_deportiva.api.auth.exception;

// No se pudo enviar el email de recuperación (servidor SMTP caído o mal configurado). Responde 503 y el token
// generado se descarta (rollback), así no queda un token que nadie recibió
public class PasswordResetMailException extends RuntimeException {

    public PasswordResetMailException(Throwable cause) {
        super("Falló el envío del email de recuperación", cause);
    }
}
