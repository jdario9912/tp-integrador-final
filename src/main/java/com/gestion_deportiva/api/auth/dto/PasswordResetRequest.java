package com.gestion_deportiva.api.auth.dto;

import com.gestion_deportiva.api.common.validation.MaxUtf8Bytes;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// La política de la nueva contraseña es la misma del registro (RegisterCoachRequest)
public record PasswordResetRequest(

        @NotBlank(message = "El token es obligatorio")
        @Size(max = 100, message = "El token no puede superar los 100 caracteres")
        String token,

        // BCrypt rechaza más de 72 bytes (no caracteres): la ñ y las vocales con acento ocupan 2 en UTF-8
        @NotBlank(message = "La contraseña es obligatoria")
        @Size(min = 8, message = "La contraseña debe tener al menos 8 caracteres")
        @MaxUtf8Bytes(value = 72, message = "La contraseña no puede superar los 72 bytes (la ñ y las letras con acento cuentan doble)")
        String newPassword
) {
}
