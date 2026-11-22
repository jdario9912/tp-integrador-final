package com.gestion_deportiva.api.user.dto;

import com.gestion_deportiva.api.common.validation.MaxUtf8Bytes;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// US-48 · Cambio de contraseña del propio usuario. La nueva tiene la misma política que el alta (RegisterCoachRequest).
// La actual no lleva mínimo: una contraseña corta incorrecta responde "no es correcta", no una regla de longitud
public record ChangePasswordRequest(

        @NotBlank(message = "La contraseña actual es obligatoria")
        @MaxUtf8Bytes(value = 72, message = "La contraseña actual no puede superar los 72 bytes (la ñ y las letras con acento cuentan doble)")
        String currentPassword,

        // BCrypt rechaza más de 72 bytes (no caracteres): la ñ y las vocales con acento ocupan 2 en UTF-8
        @NotBlank(message = "La nueva contraseña es obligatoria")
        @Size(min = 8, message = "La nueva contraseña debe tener al menos 8 caracteres")
        @MaxUtf8Bytes(value = 72, message = "La nueva contraseña no puede superar los 72 bytes (la ñ y las letras con acento cuentan doble)")
        String newPassword
) {
}
