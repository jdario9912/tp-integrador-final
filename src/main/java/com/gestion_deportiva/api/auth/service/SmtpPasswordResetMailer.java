package com.gestion_deportiva.api.auth.service;

import com.gestion_deportiva.api.auth.exception.PasswordResetMailException;
import com.gestion_deportiva.api.config.PasswordResetProperties;
import com.gestion_deportiva.api.user.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

import java.time.Duration;

// Email de texto plano por SMTP (spring.mail.*). En dev lo recibe Mailpit (http://localhost:8025)
@Component
@RequiredArgsConstructor
public class SmtpPasswordResetMailer implements PasswordResetMailer {

    static final String SUBJECT = "Recuperación de contraseña";

    private final JavaMailSender mailSender;
    private final PasswordResetProperties properties;

    @Override
    public void send(User user, String resetLink, Duration validity) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(properties.mailFrom());
        message.setTo(user.getEmail());
        message.setSubject(SUBJECT);
        message.setText("""
                Hola %s:

                Recibimos un pedido para recuperar tu contraseña. Para definir una nueva, entrá a este enlace:

                %s

                El enlace se puede usar una sola vez y vence en %d minutos. Si no lo pediste, ignorá este email: tu \
                contraseña no cambia.
                """.formatted(user.getFirstName(), resetLink, validity.toMinutes()));
        try {
            mailSender.send(message);
        } catch (MailException ex) {
            throw new PasswordResetMailException(ex);
        }
    }
}
