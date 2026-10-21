package com.gestion_deportiva.api.coach.dto;

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

        // BCrypt solo usa los primeros 72 bytes: más largo daría una falsa sensación de seguridad
        @NotBlank(message = "La contraseña es obligatoria")
        @Size(min = 8, max = 72, message = "La contraseña debe tener entre 8 y 72 caracteres")
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
