package com.gestion_deportiva.api.auth.service;

import com.gestion_deportiva.api.auth.exception.PasswordResetMailException;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.config.PasswordResetProperties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import java.time.Duration;

import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class SmtpPasswordResetMailerTest {

    private static final String LINK = "http://localhost:5173/reset-password?token=abc";

    @Mock
    private JavaMailSender mailSender;

    private final Coach user = coach("ana@test.com");

    private SmtpPasswordResetMailer mailer() {
        return new SmtpPasswordResetMailer(mailSender,
                new PasswordResetProperties(Duration.ofMinutes(30), "http://localhost:5173/reset-password",
                        "no-reply@test.com"));
    }

    @Test
    void shouldSendTheLinkAndTheValidityToTheUser() {
        // Act
        mailer().send(user, LINK, Duration.ofMinutes(30));

        // Assert
        ArgumentCaptor<SimpleMailMessage> sent = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(sent.capture());
        assertArrayEquals(new String[]{"ana@test.com"}, sent.getValue().getTo());
        assertEquals("no-reply@test.com", sent.getValue().getFrom());
        assertEquals(SmtpPasswordResetMailer.SUBJECT, sent.getValue().getSubject());
        assertTrue(sent.getValue().getText().contains(LINK));
        assertTrue(sent.getValue().getText().contains("30 minutos"));
    }

    @Test
    void shouldWrapTheSmtpFailure() {
        // Arrange
        doThrow(new MailSendException("SMTP caído")).when(mailSender).send(any(SimpleMailMessage.class));

        // Act + Assert
        assertThrows(PasswordResetMailException.class, () -> mailer().send(user, LINK, Duration.ofMinutes(30)));
    }
}
