package com.gestion_deportiva.api.e2e;

import com.gestion_deportiva.api.TestcontainersConfiguration;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.repository.AthleteRepository;
import com.gestion_deportiva.api.auth.exception.AccountDisabledException;
import com.gestion_deportiva.api.auth.exception.InvalidCredentialsException;
import com.gestion_deportiva.api.auth.exception.SessionExpiredException;
import com.gestion_deportiva.api.auth.service.JwtService;
import com.gestion_deportiva.api.auth.service.RefreshTokenGenerator;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
import com.gestion_deportiva.api.config.JwtConfig;
import com.gestion_deportiva.api.config.JwtProperties;
import com.gestion_deportiva.api.user.model.User;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.sql.Timestamp;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static com.gestion_deportiva.api.support.IdentityFixtures.RAW_PASSWORD;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Flujo completo de la US-02 por HTTP: login, refresh y acceso con el access token
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
class AuthE2ETest {

    private static final String LOGIN = "/api/auth/login";
    private static final String REFRESH = "/api/auth/refresh";
    private static final String ME = "/api/auth/me";

    @LocalServerPort
    private int port;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JsonMapper jsonMapper;

    @Autowired
    private CoachRepository coachRepository;

    @Autowired
    private AthleteRepository athleteRepository;

    @Autowired
    private RefreshTokenGenerator refreshTokenGenerator;

    @Autowired
    private JwtEncoder jwtEncoder;

    @Autowired
    private JwtProperties jwtProperties;

    private RestClient client;

    @BeforeEach
    void setUp() {
        client = RestClient.create("http://localhost:" + port);
    }

    // Sin @Transactional (la request corre en otro hilo): se limpia a mano. CASCADE borra también refresh_tokens
    @AfterEach
    void cleanUp() {
        jdbcTemplate.execute("TRUNCATE users CASCADE");
    }

    // ---------- login ----------

    @Test
    void shouldLoginReturningTokensAndRoleAndRecordTheLastLogin() {
        // Arrange
        Coach ana = saveCoach("ana@test.com", true);

        // Act: el email no distingue mayúsculas
        ResponseEntity<String> response = login("ANA@Test.com", RAW_PASSWORD);

        // Assert: respuesta
        assertEquals(HttpStatus.OK, response.getStatusCode());
        JsonNode body = json(response);
        assertFalse(body.get("accessToken").asString().isBlank());
        assertEquals("Bearer", body.get("tokenType").asString());
        assertEquals(jwtProperties.accessTokenTtl().toSeconds(), body.get("expiresIn").asLong());
        assertEquals(jwtProperties.refreshTokenTtl().toSeconds(), body.get("refreshExpiresIn").asLong());
        assertEquals("COACH", body.get("role").asString());
        JsonNode user = body.get("user");
        assertEquals(ana.getId().toString(), user.get("id").asString());
        assertEquals("ana@test.com", user.get("email").asString());
        assertEquals("Ana", user.get("firstName").asString());
        assertFalse(response.getBody().contains("passwordHash"));
        assertFalse(response.getBody().contains(ana.getPasswordHash()));

        // Assert: base de datos
        assertNotNull(jdbcTemplate.queryForObject(
                "select last_login_at from users where id = ?", Timestamp.class, ana.getId()));
        String refreshToken = body.get("refreshToken").asString();
        String storedHash = jdbcTemplate.queryForObject(
                "select token_hash from refresh_tokens where user_id = ?", String.class, ana.getId());
        assertEquals(refreshTokenGenerator.hash(refreshToken), storedHash);
        assertNotEquals(refreshToken, storedHash);

        // Assert: el access token sirve para un endpoint protegido
        ResponseEntity<String> me = me(body.get("accessToken").asString());
        assertEquals(HttpStatus.OK, me.getStatusCode());
        assertEquals("ana@test.com", json(me).get("email").asString());
    }

    @Test
    void shouldLoginAnAthleteWithTheAthleteRole() {
        athleteRepository.saveAndFlush(new Athlete("Leo", "Gil", "leo@test.com",
                passwordEncoder.encode(RAW_PASSWORD), null));

        ResponseEntity<String> response = login("leo@test.com", RAW_PASSWORD);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("ATHLETE", json(response).get("role").asString());
    }

    @Test
    void shouldReturnTheSame401ForAWrongPasswordAndAnUnknownEmail() {
        // Arrange
        Coach ana = saveCoach("ana@test.com", true);

        // Act
        ResponseEntity<String> wrongPassword = login("ana@test.com", "otra-clave-123");
        ResponseEntity<String> unknownEmail = login("nadie@test.com", RAW_PASSWORD);

        // Assert: misma respuesta (salvo el timestamp), no revela si el email existe
        for (ResponseEntity<String> response : List.of(wrongPassword, unknownEmail)) {
            assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
            JsonNode body = json(response);
            assertEquals(401, body.get("status").asInt());
            assertEquals("Unauthorized", body.get("error").asString());
            assertEquals(InvalidCredentialsException.MESSAGE, body.get("message").asString());
            assertEquals(LOGIN, body.get("path").asString());
        }
        assertNull(jdbcTemplate.queryForObject(
                "select last_login_at from users where id = ?", Timestamp.class, ana.getId()));
        assertEquals(0, countTokens());
    }

    @Test
    void shouldReturn403ForADisabledAccountOnlyWithTheRightPassword() {
        // Arrange
        saveCoach("ana@test.com", false);

        // Act
        ResponseEntity<String> rightPassword = login("ana@test.com", RAW_PASSWORD);
        ResponseEntity<String> wrongPassword = login("ana@test.com", "otra-clave-123");

        // Assert
        assertEquals(HttpStatus.FORBIDDEN, rightPassword.getStatusCode());
        assertEquals(AccountDisabledException.MESSAGE, json(rightPassword).get("message").asString());
        assertEquals(HttpStatus.UNAUTHORIZED, wrongPassword.getStatusCode());
        assertEquals(0, countTokens());
    }

    @Test
    void shouldReturn400WithFieldDetailsWhenTheBodyIsInvalid() {
        // Act
        ResponseEntity<String> response = post(LOGIN, "{\"email\": \"no-es-un-email\"}", null);

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        Set<String> fields = new HashSet<>();
        json(response).get("fieldErrors").forEach(error -> fields.add(error.get("field").asString()));
        assertEquals(Set.of("email", "password"), fields);
    }

    @Test
    void shouldReturn400WhenTheBodyIsEmptyOrMalformed() {
        assertEquals(HttpStatus.BAD_REQUEST, post(LOGIN, "", null).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST, post(LOGIN, "{\"email\": ", null).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST, post(REFRESH, "{}", null).getStatusCode());
    }

    // ---------- refresh ----------

    @Test
    void shouldRotateTheRefreshTokenAndRejectTheOldOne() {
        // Arrange
        saveCoach("ana@test.com", true);
        String firstRefresh = json(login("ana@test.com", RAW_PASSWORD)).get("refreshToken").asString();

        // Act
        ResponseEntity<String> refreshed = refresh(firstRefresh);

        // Assert: nuevo par de tokens que funciona
        assertEquals(HttpStatus.OK, refreshed.getStatusCode());
        JsonNode body = json(refreshed);
        String secondRefresh = body.get("refreshToken").asString();
        assertNotEquals(firstRefresh, secondRefresh);
        assertEquals("COACH", body.get("role").asString());
        assertEquals(HttpStatus.OK, me(body.get("accessToken").asString()).getStatusCode());
        assertEquals(1, countTokens());

        // Assert: el refresh token usado ya no sirve
        ResponseEntity<String> reused = refresh(firstRefresh);
        assertEquals(HttpStatus.UNAUTHORIZED, reused.getStatusCode());
        assertEquals(SessionExpiredException.MESSAGE, json(reused).get("message").asString());
        assertEquals(HttpStatus.OK, refresh(secondRefresh).getStatusCode());
    }

    @Test
    void aNewLoginInvalidatesThePreviousSession() {
        // Arrange: una sola sesión activa por usuario
        saveCoach("ana@test.com", true);
        String firstSession = json(login("ana@test.com", RAW_PASSWORD)).get("refreshToken").asString();
        String secondSession = json(login("ana@test.com", RAW_PASSWORD)).get("refreshToken").asString();

        // Act + Assert
        assertEquals(HttpStatus.UNAUTHORIZED, refresh(firstSession).getStatusCode());
        assertEquals(HttpStatus.OK, refresh(secondSession).getStatusCode());
    }

    @Test
    void shouldRejectAnExpiredOrUnknownRefreshToken() {
        // Arrange: token vencido insertado directamente en la base
        Coach ana = saveCoach("ana@test.com", true);
        jdbcTemplate.update("insert into refresh_tokens (user_id, token_hash, issued_at, expires_at) "
                        + "values (?, ?, now() - interval '3 hours', now() - interval '1 hour')",
                ana.getId(), refreshTokenGenerator.hash("token-vencido"));

        // Act + Assert
        assertEquals(HttpStatus.UNAUTHORIZED, refresh("token-vencido").getStatusCode());
        assertEquals(HttpStatus.UNAUTHORIZED, refresh("token-inventado").getStatusCode());
    }

    @Test
    void shouldRejectTheRefreshOfAnAccountDisabledAfterLogin() {
        // Arrange
        Coach ana = saveCoach("ana@test.com", true);
        String refreshToken = json(login("ana@test.com", RAW_PASSWORD)).get("refreshToken").asString();
        jdbcTemplate.update("update users set active = false where id = ?", ana.getId());

        // Act
        ResponseEntity<String> response = refresh(refreshToken);

        // Assert: 403 y la sesión queda borrada (el borrado no se revierte con la excepción)
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals(AccountDisabledException.MESSAGE, json(response).get("message").asString());
        assertEquals(0, countTokens());
    }

    // El front puede mandar el access token vencido al refrescar: no debe bloquear el refresh
    @Test
    void shouldRefreshEvenWithAnExpiredAccessTokenInTheHeader() {
        // Arrange
        Coach ana = saveCoach("ana@test.com", true);
        String refreshToken = json(login("ana@test.com", RAW_PASSWORD)).get("refreshToken").asString();
        String expiredAccessToken = issueAccessToken(ana, Instant.now().minus(Duration.ofHours(1)), jwtEncoder);

        // Act
        ResponseEntity<String> response = post(REFRESH, body(Map.of("refreshToken", refreshToken)),
                expiredAccessToken);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
    }

    // ---------- acceso con el access token ----------

    @Test
    void protectedEndpointsRequireAnAccessToken() {
        ResponseEntity<String> response = me(null);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals(401, body.get("status").asInt());
        assertEquals("Unauthorized", body.get("error").asString());
        assertEquals(ME, body.get("path").asString());
    }

    @Test
    void shouldRejectAnExpiredAccessToken() {
        Coach ana = saveCoach("ana@test.com", true);
        String expired = issueAccessToken(ana, Instant.now().minus(Duration.ofHours(1)), jwtEncoder);

        assertEquals(HttpStatus.UNAUTHORIZED, me(expired).getStatusCode());
    }

    @Test
    void shouldRejectAnAccessTokenSignedWithAnotherSecret() {
        Coach ana = saveCoach("ana@test.com", true);
        JwtProperties otherSecret = new JwtProperties("otro-secreto-distinto-de-al-menos-32-bytes",
                jwtProperties.issuer(), jwtProperties.accessTokenTtl(), jwtProperties.refreshTokenTtl());
        String forged = issueAccessToken(ana, Instant.now(), new JwtConfig().jwtEncoder(otherSecret));

        assertEquals(HttpStatus.UNAUTHORIZED, me(forged).getStatusCode());
    }

    @Test
    void shouldRejectAnAccessTokenWhosePayloadWasTampered() {
        // Arrange: un atleta intenta cambiar su rol a COACH sin poder volver a firmar el token
        Athlete leo = athleteRepository.saveAndFlush(new Athlete("Leo", "Gil", "leo@test.com",
                passwordEncoder.encode(RAW_PASSWORD), null));
        String[] parts = issueAccessToken(leo, Instant.now(), jwtEncoder).split("\\.");
        String payload = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8)
                .replace("\"ATHLETE\"", "\"COACH\"");
        String tampered = parts[0] + "."
                + Base64.getUrlEncoder().withoutPadding().encodeToString(payload.getBytes(StandardCharsets.UTF_8))
                + "." + parts[2];

        // Act + Assert
        assertEquals(HttpStatus.UNAUTHORIZED, me(tampered).getStatusCode());
    }

    @Test
    void shouldRejectAnAccessTokenOfAUserThatNoLongerExists() {
        Coach ana = saveCoach("ana@test.com", true);
        String accessToken = json(login("ana@test.com", RAW_PASSWORD)).get("accessToken").asString();
        jdbcTemplate.update("delete from users where id = ?", ana.getId());

        assertEquals(HttpStatus.UNAUTHORIZED, me(accessToken).getStatusCode());
    }

    // ---------- helpers ----------

    private Coach saveCoach(String email, boolean active) {
        Coach coach = new Coach("Ana", "Paz", email, passwordEncoder.encode(RAW_PASSWORD));
        if (!active) {
            coach.deactivate();
        }
        return coachRepository.saveAndFlush(coach);
    }

    private String issueAccessToken(User user, Instant issuedAt, JwtEncoder encoder) {
        return new JwtService(encoder, jwtProperties).issue(user, issuedAt).value();
    }

    private ResponseEntity<String> login(String email, String password) {
        return post(LOGIN, body(Map.of("email", email, "password", password)), null);
    }

    private ResponseEntity<String> refresh(String refreshToken) {
        return post(REFRESH, body(Map.of("refreshToken", refreshToken)), null);
    }

    private ResponseEntity<String> me(String accessToken) {
        return client.get()
                .uri(ME)
                .headers(headers -> bearer(headers, accessToken))
                .retrieve()
                .onStatus(status -> true, (req, res) -> {
                })
                .toEntity(String.class);
    }

    private ResponseEntity<String> post(String path, String body, String accessToken) {
        return client.post()
                .uri(path)
                .contentType(MediaType.APPLICATION_JSON)
                .headers(headers -> bearer(headers, accessToken))
                .body(body)
                .retrieve()
                // Los 4xx se validan en cada test, no deben lanzar excepción
                .onStatus(status -> true, (req, res) -> {
                })
                .toEntity(String.class);
    }

    private static void bearer(HttpHeaders headers, String accessToken) {
        if (accessToken != null) {
            headers.setBearerAuth(accessToken);
        }
    }

    private String body(Map<String, String> values) {
        return jsonMapper.writeValueAsString(values);
    }

    private JsonNode json(ResponseEntity<String> response) {
        return jsonMapper.readTree(response.getBody());
    }

    private int countTokens() {
        Integer count = jdbcTemplate.queryForObject("select count(*) from refresh_tokens", Integer.class);
        return count == null ? 0 : count;
    }
}
