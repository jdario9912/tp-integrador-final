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
import com.gestion_deportiva.api.config.JwtProperties;
import com.gestion_deportiva.api.user.model.User;
import com.gestion_deportiva.api.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

// Login y refresh (US-02). Política: una sola sesión activa por usuario; cada login o refresh
// borra los refresh tokens anteriores del usuario y emite uno nuevo.
@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    // BCrypt solo procesa 72 bytes y Spring Security rechaza contraseñas más largas con una excepción
    static final int BCRYPT_MAX_BYTES = 72;

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenGenerator refreshTokenGenerator;
    private final JwtProperties properties;
    private final Clock clock;

    // Hash contra el que se compara cuando el email no existe, para que el tiempo de respuesta
    // sea el mismo que con una contraseña incorrecta y no revele qué emails están registrados
    private final String dummyPasswordHash;

    public AuthService(UserRepository userRepository, RefreshTokenRepository refreshTokenRepository,
                       PasswordEncoder passwordEncoder, JwtService jwtService,
                       RefreshTokenGenerator refreshTokenGenerator, JwtProperties properties, Clock clock) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTokenGenerator = refreshTokenGenerator;
        this.properties = properties;
        this.clock = clock;
        this.dummyPasswordHash = passwordEncoder.encode(UUID.randomUUID().toString());
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String password = request.password();
        // Nunca puede ser una contraseña válida: se rechaza antes de llegar a BCrypt
        if (password.getBytes(StandardCharsets.UTF_8).length > BCRYPT_MAX_BYTES) {
            log.warn("Login rechazado: contraseña de más de {} bytes", BCRYPT_MAX_BYTES);
            throw new InvalidCredentialsException();
        }

        Optional<User> found = userRepository.findByEmail(User.normalizeEmail(request.email()));
        if (found.isEmpty()) {
            passwordEncoder.matches(password, dummyPasswordHash);
            log.warn("Login rechazado: email no registrado");
            throw new InvalidCredentialsException();
        }

        User user = found.get();
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            log.warn("Login rechazado para el usuario {}: contraseña incorrecta", user.getId());
            throw new InvalidCredentialsException();
        }
        // Recién con la contraseña correcta: así no se revela qué cuentas están desactivadas
        if (!user.isActive()) {
            log.warn("Login rechazado para el usuario {}: cuenta desactivada", user.getId());
            throw new AccountDisabledException();
        }

        Instant now = clock.instant();
        user.recordLogin(now);
        AuthResponse response = startSession(user, now);
        log.info("Login exitoso del usuario {}", user.getId());
        return response;
    }

    // noRollbackFor: si la cuenta está desactivada, el borrado de sus tokens tiene que quedar confirmado
    @Transactional(noRollbackFor = AccountDisabledException.class)
    public AuthResponse refresh(RefreshRequest request) {
        Instant now = clock.instant();
        RefreshToken stored = refreshTokenRepository
                .findByTokenHash(refreshTokenGenerator.hash(request.refreshToken()))
                .filter(token -> token.isActive(now))
                .orElseThrow(() -> {
                    log.warn("Refresh rechazado: token inexistente, vencido o revocado");
                    return new SessionExpiredException();
                });

        // Reclamo atómico: si otra request usó este mismo token al mismo tiempo, el delete no borra nada
        if (refreshTokenRepository.deleteOne(stored.getId()) == 0) {
            log.warn("Refresh rechazado: el token ya fue usado");
            throw new SessionExpiredException();
        }

        User user = stored.getUser();
        if (!user.isActive()) {
            refreshTokenRepository.deleteAllByUserId(user.getId());
            log.warn("Refresh rechazado para el usuario {}: cuenta desactivada", user.getId());
            throw new AccountDisabledException();
        }

        AuthResponse response = startSession(user, now);
        log.info("Refresh exitoso del usuario {}", user.getId());
        return response;
    }

    @Transactional(readOnly = true)
    public AuthUserResponse currentUser(UUID userId) {
        // El access token puede seguir vigente unos minutos después de que se borre o desactive el usuario
        User user = userRepository.findById(userId).orElseThrow(SessionExpiredException::new);
        if (!user.isActive()) {
            throw new AccountDisabledException();
        }
        return AuthUserResponse.from(user);
    }

    private AuthResponse startSession(User user, Instant now) {
        // Una sola sesión por usuario: se descartan los refresh tokens anteriores
        refreshTokenRepository.deleteAllByUserId(user.getId());

        String refreshToken = refreshTokenGenerator.generate();
        refreshTokenRepository.save(new RefreshToken(user, refreshTokenGenerator.hash(refreshToken), now,
                now.plus(properties.refreshTokenTtl())));

        JwtService.AccessToken accessToken = jwtService.issue(user, now);
        return AuthResponse.of(accessToken.value(), properties.accessTokenTtl().toSeconds(), refreshToken,
                properties.refreshTokenTtl().toSeconds(), AuthUserResponse.from(user));
    }
}
