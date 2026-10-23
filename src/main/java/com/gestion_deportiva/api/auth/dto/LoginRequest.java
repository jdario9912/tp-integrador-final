package com.gestion_deportiva.api.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(

        @NotBlank(message = "El email es obligatorio")
        @Email(message = "El email no tiene un formato válido")
        String email,

        @NotBlank(message = "La contraseña es obligatoria")
        String password
) {

    // Evita que la contraseña aparezca en logs si alguien loguea el request
    @Override
    public String toString() {
        return "LoginRequest[email=" + email + ", password=***]";
    }
}
