package com.gestion_deportiva.api.coach.dto;

import com.gestion_deportiva.api.common.validation.MaxUtf8Bytes;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// No tiene campo "role": el rol siempre es COACH y no se toma del body
public record RegisterCoachRequest(

        @NotBlank(message = "El nombre es obligatorio")
        @Size(max = 100, message = "El nombre no puede superar los 100 caracteres")
        String firstName,

        @NotBlank(message = "El apellido es obligatorio")
        @Size(max = 100, message = "El apellido no puede superar los 100 caracteres")
        String lastName,

        @NotBlank(message = "El email es obligatorio")
        @Email(message = "El email no tiene un formato válido")
        @Size(max = 255, message = "El email no puede superar los 255 caracteres")
        String email,

        // BCrypt rechaza más de 72 bytes (no caracteres): la ñ y las vocales con acento ocupan 2 en UTF-8
        @NotBlank(message = "La contraseña es obligatoria")
        @Size(min = 8, message = "La contraseña debe tener al menos 8 caracteres")
        @MaxUtf8Bytes(value = 72, message = "La contraseña no puede superar los 72 bytes (la ñ y las letras con acento cuentan doble)")
        String password,

        @Size(max = 30, message = "El teléfono no puede superar los 30 caracteres")
        String phone,

        @Size(max = 100, message = "La especialidad no puede superar los 100 caracteres")
        String specialty,

        @Size(max = 50, message = "La matrícula no puede superar los 50 caracteres")
        String licenseNumber,

        @Size(max = 1000, message = "La biografía no puede superar los 1000 caracteres")
        String bio
) {
}
