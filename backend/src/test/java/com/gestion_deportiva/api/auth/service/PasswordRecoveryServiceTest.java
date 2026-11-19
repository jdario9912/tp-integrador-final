package com.gestion_deportiva.api.auth.service;

import com.gestion_deportiva.api.auth.dto.PasswordRecoveryRequest;
import com.gestion_deportiva.api.auth.dto.PasswordResetRequest;
import com.gestion_deportiva.api.auth.exception.InvalidPasswordResetTokenException;
import com.gestion_deportiva.api.auth.exception.PasswordResetMailException;
import com.gestion_deportiva.api.auth.model.PasswordResetToken;
import com.gestion_deportiva.api.auth.repository.PasswordResetTokenRepository;
import com.gestion_deportiva.api.auth.repository.RefreshTokenRepository;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.config.PasswordResetProperties;
import com.gestion_deportiva.api.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PasswordRecoveryServiceTest {

    private static final Instant NOW = Instant.parse("2026-11-10T12:00:00Z");
    private static final Duration TTL = Duration.ofMinutes(30);
    private static final String RESET_URL = "http://localhost:5173/reset-password";
    private static final String TOKEN = "token-del-enlace";
    private static final String NEW_PASSWORD = "nuevaClave123";

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private PasswordResetMailer mailer;

    @Mock
    private PasswordEncoder passwordEncoder;

    // Real: genera tokens aleatorios y su hash SHA-256
    private final RefreshTokenGenerator tokenGenerator = new RefreshTokenGenerator();

    private PasswordRecoveryService service;

    private Coach user;

    @BeforeEach
    void setUp() {
        service = new PasswordRecoveryService(userRepository, passwordResetTokenRepository, refreshTokenRepository,
                tokenGenerator, mailer, passwordEncoder,
                new PasswordResetProperties(TTL, RESET_URL, "no-reply@test.com"), Clock.fixed(NOW, ZoneOffset.UTC));
        user = coach("ana@test.com");
        ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
    }

    // ---------- pedido del enlace ----------

    @Test
    void shouldSaveTheHashAndMailTheLinkWithTheRawToken() {
        // Arrange: el email llega con otra capitalización y espacios
        when(userRepository.findByEmail("ana@test.com")).thenReturn(Optional.of(user));

        // Act
        service.requestRecovery(new PasswordRecoveryRequest("  ANA@test.com "));

        // Assert: se invalidan los enlaces anteriores antes de guardar el nuevo
        ArgumentCaptor<PasswordResetToken> saved = ArgumentCaptor.forClass(PasswordResetToken.class);
        ArgumentCaptor<String> link = ArgumentCaptor.forClass(String.class);
        InOrder order = inOrder(passwordResetTokenRepository, mailer);
        order.verify(passwordResetTokenRepository).deleteUnusedByUserId(user.getId());
        order.verify(passwordResetTokenRepository).save(saved.capture());
        order.verify(mailer).send(eq(user), link.capture(),
                eq(TTL));

        String rawToken = link.getValue().substring((RESET_URL + "?token=").length());
        assertEquals(RESET_URL + "?token=" + rawToken, link.getValue());
        assertEquals(tokenGenerator.hash(rawToken), saved.getValue().getTokenHash());
        assertEquals(NOW.plus(TTL), saved.getValue().getExpiresAt());
    }

    @Test
    void shouldDoNothingWhenTheEmailIsNotRegistered() {
        // Arrange
        when(userRepository.findByEmail("nadie@test.com")).thenReturn(Optional.empty());

        // Act
        service.requestRecovery(new PasswordRecoveryRequest("nadie@test.com"));

        // Assert: sin error (el controller responde 202 igual) y sin email
        verifyNoInteractions(passwordResetTokenRepository, mailer);
    }

    @Test
    void shouldDoNothingWhenTheAccountIsDisabled() {
        // Arrange
        user.deactivate();
        when(userRepository.findByEmail("ana@test.com")).thenReturn(Optional.of(user));

        // Act
        service.requestRecovery(new PasswordRecoveryRequest("ana@test.com"));

        // Assert
        verifyNoInteractions(passwordResetTokenRepository, mailer);
    }

    @Test
    void shouldPropagateTheMailFailureSoTheTokenIsRolledBack() {
        // Arrange
        when(userRepository.findByEmail("ana@test.com")).thenReturn(Optional.of(user));
        doThrow(new PasswordResetMailException(new RuntimeException("SMTP caído"))).when(mailer)
                .send(any(), anyString(), any());

        // Act + Assert: la excepción sale del método @Transactional y hace rollback del token guardado
        assertThrows(PasswordResetMailException.class,
                () -> service.requestRecovery(new PasswordRecoveryRequest("ana@test.com")));
    }

    // ---------- nueva contraseña ----------

    @Test
    void shouldChangeThePasswordAndRevokeTheSessions() {
        // Arrange
        PasswordResetToken stored = storedToken(NOW.plusSeconds(60));
        when(passwordResetTokenRepository.findByTokenHash(tokenGenerator.hash(TOKEN)))
                .thenReturn(Optional.of(stored));
        when(passwordResetTokenRepository.markUsed(stored.getId(), NOW)).thenReturn(1);
        when(passwordEncoder.encode(NEW_PASSWORD)).thenReturn("$2a$10$nuevoHash");

        // Act
        service.resetPassword(new PasswordResetRequest(TOKEN, NEW_PASSWORD));

        // Assert
        assertEquals("$2a$10$nuevoHash", user.getPasswordHash());
        verify(passwordResetTokenRepository).deleteUnusedByUserId(user.getId());
        verify(refreshTokenRepository).revokeAllByUserId(user.getId());
    }

    @Test
    void shouldRejectAnUnknownToken() {
        // Arrange
        when(passwordResetTokenRepository.findByTokenHash(tokenGenerator.hash(TOKEN))).thenReturn(Optional.empty());

        // Act + Assert
        assertThrows(InvalidPasswordResetTokenException.class,
                () -> service.resetPassword(new PasswordResetRequest(TOKEN, NEW_PASSWORD)));
        verifyNoInteractions(refreshTokenRepository, passwordEncoder);
    }

    @Test
    void shouldRejectAnExpiredToken() {
        // Arrange: venció justo ahora (el vencimiento es exclusivo)
        PasswordResetToken stored = storedToken(NOW);
        when(passwordResetTokenRepository.findByTokenHash(tokenGenerator.hash(TOKEN)))
                .thenReturn(Optional.of(stored));

        // Act + Assert
        assertThrows(InvalidPasswordResetTokenException.class,
                () -> service.resetPassword(new PasswordResetRequest(TOKEN, NEW_PASSWORD)));
        verify(passwordResetTokenRepository, never()).markUsed(any(), any());
    }

    @Test
    void shouldRejectAUsedToken() {
        // Arrange
        PasswordResetToken stored = storedToken(NOW.plusSeconds(60));
        ReflectionTestUtils.setField(stored, "usedAt", NOW.minusSeconds(10));
        when(passwordResetTokenRepository.findByTokenHash(tokenGenerator.hash(TOKEN)))
                .thenReturn(Optional.of(stored));

        // Act + Assert
        assertThrows(InvalidPasswordResetTokenException.class,
                () -> service.resetPassword(new PasswordResetRequest(TOKEN, NEW_PASSWORD)));
    }

    @Test
    void shouldRejectATokenClaimedByAConcurrentRequest() {
        // Arrange: otra request lo marcó como usado entre la lectura y el update
        PasswordResetToken stored = storedToken(NOW.plusSeconds(60));
        when(passwordResetTokenRepository.findByTokenHash(tokenGenerator.hash(TOKEN)))
                .thenReturn(Optional.of(stored));
        when(passwordResetTokenRepository.markUsed(stored.getId(), NOW)).thenReturn(0);

        // Act + Assert
        assertThrows(InvalidPasswordResetTokenException.class,
                () -> service.resetPassword(new PasswordResetRequest(TOKEN, NEW_PASSWORD)));
        verifyNoInteractions(refreshTokenRepository, passwordEncoder);
    }

    private PasswordResetToken storedToken(Instant expiresAt) {
        PasswordResetToken token = new PasswordResetToken(user, tokenGenerator.hash(TOKEN), expiresAt);
        ReflectionTestUtils.setField(token, "id", UUID.randomUUID());
        return token;
    }
}
