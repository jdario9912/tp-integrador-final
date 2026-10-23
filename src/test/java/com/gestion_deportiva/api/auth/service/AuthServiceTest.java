package com.gestion_deportiva.api.auth.service;

import com.gestion_deportiva.api.auth.dto.AuthResponse;
import com.gestion_deportiva.api.auth.dto.AuthUserResponse;
import com.gestion_deportiva.api.auth.dto.LoginRequest;
import com.gestion_deportiva.api.auth.dto.RefreshRequest;
import com.gestion_deportiva.api.auth.exception.AccountDisabledException;
import com.gestion_deportiva.api.auth.exception.InvalidCredentialsException;
import com.gestion_deportiva.api.auth.exception.SessionExpiredException;
import com.gestion_deportiva.api.auth.model.RefreshToken;
import com.gestion_deportiva.api.auth.repository.RefreshTokenRepository;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.config.JwtProperties;
import com.gestion_deportiva.api.user.model.enums.Role;
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

import static com.gestion_deportiva.api.support.IdentityFixtures.PASSWORD_HASH;
import static com.gestion_deportiva.api.support.IdentityFixtures.RAW_PASSWORD;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-22T12:00:00Z");
    private static final Duration ACCESS_TTL = Duration.ofMinutes(15);
    private static final Duration REFRESH_TTL = Duration.ofHours(2);
    private static final String DUMMY_HASH = "$2a$10$dummyHashForTimingProtection";
    private static final String ACCESS_TOKEN = "access-token";

    private final JwtProperties properties =
            new JwtProperties("secreto-de-prueba-con-al-menos-32-bytes", "api-test", ACCESS_TTL, REFRESH_TTL);
    // Generador real: es lógica pura y así se verifica que se guarda el hash del token devuelto
    private final RefreshTokenGenerator refreshTokenGenerator = new RefreshTokenGenerator();

    @Mock
    private UserRepository userRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        // El constructor calcula el hash dummy con el encoder
        when(passwordEncoder.encode(anyString())).thenReturn(DUMMY_HASH);
        authService = new AuthService(userRepository, refreshTokenRepository, passwordEncoder, jwtService,
                refreshTokenGenerator, properties, Clock.fixed(NOW, ZoneOffset.UTC));
    }

    // ---------- login ----------

    @Test
    void shouldLoginReturningTokensAndRoleAndRecordTheLastLogin() {
        // Arrange
        Coach coach = withId(coach("ana@test.com"));
        when(userRepository.findByEmail("ana@test.com")).thenReturn(Optional.of(coach));
        when(passwordEncoder.matches(RAW_PASSWORD, PASSWORD_HASH)).thenReturn(true);
        when(jwtService.issue(coach, NOW)).thenReturn(new JwtService.AccessToken(ACCESS_TOKEN, NOW.plus(ACCESS_TTL)));

        // Act: el email se normaliza antes de buscar
        AuthResponse response = authService.login(new LoginRequest("  Ana@Test.COM ", RAW_PASSWORD));

        // Assert: respuesta
        assertEquals(ACCESS_TOKEN, response.accessToken());
        assertEquals("Bearer", response.tokenType());
        assertEquals(ACCESS_TTL.toSeconds(), response.expiresIn());
        assertEquals(REFRESH_TTL.toSeconds(), response.refreshExpiresIn());
        assertEquals(Role.COACH, response.role());
        assertEquals(coach.getId(), response.user().id());
        assertEquals("ana@test.com", response.user().email());
        assertEquals(NOW, coach.getLastLoginAt());

        // Assert: se guarda el hash del refresh token, nunca el token en claro
        RefreshToken saved = captureSavedToken();
        assertEquals(refreshTokenGenerator.hash(response.refreshToken()), saved.getTokenHash());
        assertNotEquals(response.refreshToken(), saved.getTokenHash());
        assertSame(coach, saved.getUser());
        assertEquals(NOW, saved.getIssuedAt());
        assertEquals(NOW.plus(REFRESH_TTL), saved.getExpiresAt());
    }

    @Test
    void shouldDiscardThePreviousSessionsBeforeSavingTheNewToken() {
        // Arrange
        Coach coach = withId(coach("ana@test.com"));
        when(userRepository.findByEmail("ana@test.com")).thenReturn(Optional.of(coach));
        when(passwordEncoder.matches(RAW_PASSWORD, PASSWORD_HASH)).thenReturn(true);
        when(jwtService.issue(coach, NOW)).thenReturn(new JwtService.AccessToken(ACCESS_TOKEN, NOW.plus(ACCESS_TTL)));

        // Act
        authService.login(new LoginRequest("ana@test.com", RAW_PASSWORD));

        // Assert: una sola sesión por usuario
        InOrder order = inOrder(refreshTokenRepository);
        order.verify(refreshTokenRepository).deleteAllByUserId(coach.getId());
        order.verify(refreshTokenRepository).save(any(RefreshToken.class));
    }

    @Test
    void shouldRejectWrongPasswordWithTheGenericMessage() {
        // Arrange
        Coach coach = withId(coach("ana@test.com"));
        when(userRepository.findByEmail("ana@test.com")).thenReturn(Optional.of(coach));
        when(passwordEncoder.matches("otra-clave", PASSWORD_HASH)).thenReturn(false);

        // Act
        InvalidCredentialsException ex = assertThrows(InvalidCredentialsException.class,
                () -> authService.login(new LoginRequest("ana@test.com", "otra-clave")));

        // Assert
        assertEquals(InvalidCredentialsException.MESSAGE, ex.getMessage());
        assertNull(coach.getLastLoginAt());
        verifyNoInteractions(refreshTokenRepository, jwtService);
    }

    @Test
    void shouldRejectUnknownEmailWithTheSameMessageAndStillRunBcrypt() {
        // Arrange
        when(userRepository.findByEmail("nadie@test.com")).thenReturn(Optional.empty());

        // Act
        InvalidCredentialsException ex = assertThrows(InvalidCredentialsException.class,
                () -> authService.login(new LoginRequest("nadie@test.com", RAW_PASSWORD)));

        // Assert: misma respuesta y mismo costo que una contraseña incorrecta
        assertEquals(InvalidCredentialsException.MESSAGE, ex.getMessage());
        verify(passwordEncoder).matches(RAW_PASSWORD, DUMMY_HASH);
        verifyNoInteractions(refreshTokenRepository, jwtService);
    }

    @Test
    void shouldRejectDisabledAccountWhenThePasswordIsRight() {
        // Arrange
        Coach coach = withId(coach("ana@test.com"));
        coach.deactivate();
        when(userRepository.findByEmail("ana@test.com")).thenReturn(Optional.of(coach));
        when(passwordEncoder.matches(RAW_PASSWORD, PASSWORD_HASH)).thenReturn(true);

        // Act
        AccountDisabledException ex = assertThrows(AccountDisabledException.class,
                () -> authService.login(new LoginRequest("ana@test.com", RAW_PASSWORD)));

        // Assert
        assertEquals(AccountDisabledException.MESSAGE, ex.getMessage());
        assertNull(coach.getLastLoginAt());
        verifyNoInteractions(refreshTokenRepository, jwtService);
    }

    @Test
    void shouldNotRevealADisabledAccountWhenThePasswordIsWrong() {
        // Arrange
        Coach coach = withId(coach("ana@test.com"));
        coach.deactivate();
        when(userRepository.findByEmail("ana@test.com")).thenReturn(Optional.of(coach));
        when(passwordEncoder.matches("otra-clave", PASSWORD_HASH)).thenReturn(false);

        // Act + Assert: 401 genérico, no 403
        assertThrows(InvalidCredentialsException.class,
                () -> authService.login(new LoginRequest("ana@test.com", "otra-clave")));
    }

    @Test
    void shouldRejectPasswordLongerThan72BytesWithoutReachingBcrypt() {
        // Arrange: 37 "ñ" = 74 bytes en UTF-8 (BCrypt lanzaría una excepción)
        String password = "ñ".repeat(37);

        // Act
        assertThrows(InvalidCredentialsException.class,
                () -> authService.login(new LoginRequest("ana@test.com", password)));

        // Assert
        verify(passwordEncoder, never()).matches(any(), any());
        verifyNoInteractions(userRepository);
    }

    @Test
    void shouldAcceptPasswordOfExactly72Bytes() {
        // Arrange: 36 "ñ" = 72 bytes, el límite de BCrypt
        String password = "ñ".repeat(36);
        when(userRepository.findByEmail("ana@test.com")).thenReturn(Optional.empty());

        // Act
        assertThrows(InvalidCredentialsException.class,
                () -> authService.login(new LoginRequest("ana@test.com", password)));

        // Assert: llegó a la comparación con BCrypt
        verify(passwordEncoder).matches(password, DUMMY_HASH);
    }

    // ---------- refresh ----------

    @Test
    void shouldRotateTheRefreshToken() {
        // Arrange
        Coach coach = withId(coach("ana@test.com"));
        RefreshToken stored = storedToken(coach, "refresh-viejo", NOW.minus(Duration.ofHours(1)), NOW.plus(Duration.ofHours(1)));
        when(refreshTokenRepository.deleteOne(stored.getId())).thenReturn(1);
        when(jwtService.issue(coach, NOW)).thenReturn(new JwtService.AccessToken(ACCESS_TOKEN, NOW.plus(ACCESS_TTL)));

        // Act
        AuthResponse response = authService.refresh(new RefreshRequest("refresh-viejo"));

        // Assert: se emite un refresh token nuevo con 2 h desde ahora
        assertEquals(ACCESS_TOKEN, response.accessToken());
        assertNotEquals("refresh-viejo", response.refreshToken());
        assertEquals(Role.COACH, response.role());
        verify(refreshTokenRepository).deleteAllByUserId(coach.getId());
        RefreshToken saved = captureSavedToken();
        assertEquals(refreshTokenGenerator.hash(response.refreshToken()), saved.getTokenHash());
        assertEquals(NOW.plus(REFRESH_TTL), saved.getExpiresAt());
    }

    @Test
    void shouldRejectUnknownRefreshToken() {
        when(refreshTokenRepository.findByTokenHash(refreshTokenGenerator.hash("inventado")))
                .thenReturn(Optional.empty());

        SessionExpiredException ex = assertThrows(SessionExpiredException.class,
                () -> authService.refresh(new RefreshRequest("inventado")));

        assertEquals(SessionExpiredException.MESSAGE, ex.getMessage());
        verify(refreshTokenRepository, never()).deleteOne(any());
        verify(refreshTokenRepository, never()).save(any());
    }

    @Test
    void shouldRejectExpiredRefreshToken() {
        storedToken(withId(coach("ana@test.com")), "vencido", NOW.minus(Duration.ofHours(3)), NOW.minusSeconds(1));

        assertThrows(SessionExpiredException.class, () -> authService.refresh(new RefreshRequest("vencido")));

        verify(refreshTokenRepository, never()).deleteOne(any());
        verify(refreshTokenRepository, never()).save(any());
    }

    @Test
    void shouldRejectRevokedRefreshToken() {
        RefreshToken stored = storedToken(withId(coach("ana@test.com")), "revocado", NOW.minus(Duration.ofHours(1)),
                NOW.plus(Duration.ofHours(1)));
        stored.revoke();

        assertThrows(SessionExpiredException.class, () -> authService.refresh(new RefreshRequest("revocado")));

        verify(refreshTokenRepository, never()).save(any());
    }

    @Test
    void shouldRejectRefreshTokenAlreadyUsedByAConcurrentRequest() {
        // Arrange: otra request borró el token entre la búsqueda y el borrado
        RefreshToken stored = storedToken(withId(coach("ana@test.com")), "en-uso", NOW.minus(Duration.ofHours(1)),
                NOW.plus(Duration.ofHours(1)));
        when(refreshTokenRepository.deleteOne(stored.getId())).thenReturn(0);

        // Act + Assert
        assertThrows(SessionExpiredException.class, () -> authService.refresh(new RefreshRequest("en-uso")));
        verify(refreshTokenRepository, never()).save(any());
        verifyNoInteractions(jwtService);
    }

    @Test
    void shouldRejectRefreshOfADisabledAccountAndDiscardItsSessions() {
        // Arrange
        Coach coach = withId(coach("ana@test.com"));
        coach.deactivate();
        RefreshToken stored = storedToken(coach, "refresh", NOW.minus(Duration.ofHours(1)), NOW.plus(Duration.ofHours(1)));
        when(refreshTokenRepository.deleteOne(stored.getId())).thenReturn(1);

        // Act
        assertThrows(AccountDisabledException.class, () -> authService.refresh(new RefreshRequest("refresh")));

        // Assert
        verify(refreshTokenRepository).deleteAllByUserId(coach.getId());
        verify(refreshTokenRepository, never()).save(any());
        verifyNoInteractions(jwtService);
    }

    // ---------- usuario actual ----------

    @Test
    void shouldReturnTheCurrentUser() {
        Coach coach = withId(coach("ana@test.com"));
        when(userRepository.findById(coach.getId())).thenReturn(Optional.of(coach));

        AuthUserResponse user = authService.currentUser(coach.getId());

        assertEquals(coach.getId(), user.id());
        assertEquals("ana@test.com", user.email());
        assertEquals(Role.COACH, user.role());
    }

    @Test
    void shouldRejectCurrentUserThatNoLongerExists() {
        UUID id = UUID.randomUUID();
        when(userRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(SessionExpiredException.class, () -> authService.currentUser(id));
    }

    @Test
    void shouldRejectCurrentUserWithADisabledAccount() {
        Coach coach = withId(coach("ana@test.com"));
        coach.deactivate();
        when(userRepository.findById(coach.getId())).thenReturn(Optional.of(coach));

        assertThrows(AccountDisabledException.class, () -> authService.currentUser(coach.getId()));
    }

    // Token guardado cuyo hash corresponde a rawToken; el repositorio lo devuelve al buscarlo
    private RefreshToken storedToken(Coach coach, String rawToken, Instant issuedAt, Instant expiresAt) {
        RefreshToken token = new RefreshToken(coach, refreshTokenGenerator.hash(rawToken), issuedAt, expiresAt);
        ReflectionTestUtils.setField(token, "id", UUID.randomUUID());
        when(refreshTokenRepository.findByTokenHash(refreshTokenGenerator.hash(rawToken))).thenReturn(Optional.of(token));
        return token;
    }

    private RefreshToken captureSavedToken() {
        ArgumentCaptor<RefreshToken> captor = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokenRepository).save(captor.capture());
        return captor.getValue();
    }

    private static Coach withId(Coach coach) {
        ReflectionTestUtils.setField(coach, "id", UUID.randomUUID());
        return coach;
    }
}
