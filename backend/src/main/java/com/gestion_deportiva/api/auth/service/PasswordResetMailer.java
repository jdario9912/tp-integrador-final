package com.gestion_deportiva.api.auth.service;

import com.gestion_deportiva.api.user.model.User;

import java.time.Duration;

// Envío del enlace de recuperación (US-44). Detrás de una interfaz para que los tests no necesiten un servidor SMTP
public interface PasswordResetMailer {

    // Lanza PasswordResetMailException si no se pudo enviar
    void send(User user, String resetLink, Duration validity);
}
