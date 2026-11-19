package com.gestion_deportiva.api.e2e;

import com.gestion_deportiva.api.TestcontainersConfiguration;
import com.gestion_deportiva.api.auth.exception.InvalidPasswordResetTokenException;
import com.gestion_deportiva.api.auth.exception.PasswordResetMailException;
import com.gestion_deportiva.api.auth.service.PasswordResetMailer;
import com.gestion_deportiva.api.auth.service.RefreshTokenGenerator;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
import com.gestion_deportiva.api.config.PasswordResetProperties;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.util.Map;

import static com.gestion_deportiva.api.support.IdentityFixtures.RAW_PASSWORD;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

// US-44 · Recuperación de contraseña de punta a punta: pedido del enlace (misma respuesta exista o no el email),
// falla del envío, nueva contraseña con token de un solo uso y revocación de las sesiones. El envío del email se
// reemplaza por un mock: el enlace se lee de lo que recibió
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
class PasswordRecoveryE2ETest {

    private static final String RECOVERY = "/api/auth/password-recovery";
    private static final String RESET = "/api/auth/password-reset";
    private static final String LOGIN = "/api/auth/login";
    private static final String REFRESH = "/api/auth/refresh";

    private static final String EMAIL = "ana@test.com";
    private static final String NEW_PASSWORD = "nuevaClave456";

    private static final String VALIDATION_MESSAGE = "La solicitud tiene campos inválidos";
    private static final String MAIL_UNAVAILABLE_MESSAGE =
            "No se pudo enviar el email de recuperación. Intente nuevamente más tarde";

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
    private RefreshTokenGenerator tokenGenerator;

    @Autowired
    private PasswordResetProperties properties;

    @MockitoBean
    private PasswordResetMailer mailer;

    private RestClient client;

    private Coach ana;

    @BeforeEach
    void setUp() {
        client = RestClient.create("http://localhost:" + port);
        ana = coachRepository.saveAndFlush(new Coach("Ana", "Paz", EMAIL, passwordEncoder.encode(RAW_PASSWORD)));
    }

    // Sin @Transactional (la request corre en otro hilo): se limpia a mano. CASCADE vacía también los tokens
    @AfterEach
    void cleanUp() {
        jdbcTemplate.execute("TRUNCATE users CASCADE");
    }

    // ---------- POST /api/auth/password-recovery ----------

    @Test
    void shouldReturn202AndMailALinkWhoseTokenIsStoredOnlyAsAHash() {
        // Act
        ResponseEntity<String> response = post(RECOVERY, Map.of("email", "ANA@test.com"));

        // Assert
        assertEquals(HttpStatus.ACCEPTED, response.getStatusCode());
        String token = mailedToken();
        String storedHash = jdbcTemplate.queryForObject(
                "select token_hash from password_reset_tokens where user_id = ? and used_at is null", String.class,
                ana.getId());
        assertEquals(tokenGenerator.hash(token), storedHash);
        assertNotEquals(token, storedHash);
    }

    @Test
    void shouldReturnTheSame202WhenTheEmailIsNotRegistered() {
        // Act
        ResponseEntity<String> registered = post(RECOVERY, Map.of("email", EMAIL));
        ResponseEntity<String> unknown = post(RECOVERY, Map.of("email", "nadie@test.com"));

        // Assert: mismo status y mismo cuerpo (vacío): no revela qué emails existen
        assertEquals(registered.getStatusCode(), unknown.getStatusCode());
        assertEquals(registered.getBody(), unknown.getBody());
        verify(mailer, times(1)).send(any(), anyString(), any());
    }

    @Test
    void shouldReturn400WhenTheEmailIsInvalid() {
        ResponseEntity<String> response = post(RECOVERY, Map.of("email", "no-es-un-email"));

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals(VALIDATION_MESSAGE, json(response).get("message").asString());
        verify(mailer, never()).send(any(), anyString(), any());
    }

    @Test
    void shouldReturn503AndKeepNoTokenWhenTheMailFails() {
        // Arrange
        doThrow(new PasswordResetMailException(new RuntimeException("SMTP caído"))).when(mailer)
                .send(any(), anyString(), any());

        // Act
        ResponseEntity<String> response = post(RECOVERY, Map.of("email", EMAIL));

        // Assert: se informa y no queda un token que nadie recibió
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        assertEquals(MAIL_UNAVAILABLE_MESSAGE, json(response).get("message").asString());
        assertEquals(0, countTokens());
    }

    @Test
    void shouldInvalidateThePreviousLinkWhenANewOneIsRequested() {
        // Arrange
        post(RECOVERY, Map.of("email", EMAIL));
        String first = mailedToken();

        // Act
        post(RECOVERY, Map.of("email", EMAIL));

        // Assert
        assertEquals(1, countTokens());
        assertEquals(HttpStatus.BAD_REQUEST, post(RESET, reset(first, NEW_PASSWORD)).getStatusCode());
    }

    // ---------- POST /api/auth/password-reset ----------

    @Test
    void shouldChangeThePasswordRevokeTheSessionsAndInvalidateTheToken() {
        // Arrange: una sesión abierta y un enlace pedido
        String refreshToken = json(post(LOGIN, Map.of("email", EMAIL, "password", RAW_PASSWORD)))
                .get("refreshToken").asString();
        post(RECOVERY, Map.of("email", EMAIL));
        String token = mailedToken();

        // Act
        ResponseEntity<String> response = post(RESET, reset(token, NEW_PASSWORD));

        // Assert: la nueva contraseña entra y la vieja no
        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        assertEquals(HttpStatus.OK, post(LOGIN, Map.of("email", EMAIL, "password", NEW_PASSWORD)).getStatusCode());
        assertEquals(HttpStatus.UNAUTHORIZED,
                post(LOGIN, Map.of("email", EMAIL, "password", RAW_PASSWORD)).getStatusCode());
        // La sesión previa quedó revocada
        assertEquals(HttpStatus.UNAUTHORIZED, post(REFRESH, Map.of("refreshToken", refreshToken)).getStatusCode());
        // El token es de un solo uso
        ResponseEntity<String> reused = post(RESET, reset(token, "otraClave789"));
        assertEquals(HttpStatus.BAD_REQUEST, reused.getStatusCode());
        assertEquals(InvalidPasswordResetTokenException.MESSAGE, json(reused).get("message").asString());
        assertTrue(json(reused).path("fieldErrors").isEmpty());
    }

    @Test
    void shouldReturn400WhenTheTokenIsUnknown() {
        ResponseEntity<String> response = post(RESET, reset("token-inventado", NEW_PASSWORD));

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals(InvalidPasswordResetTokenException.MESSAGE, json(response).get("message").asString());
    }

    @Test
    void shouldReturn400WhenTheTokenExpired() {
        // Arrange: el enlace venció hace un minuto
        post(RECOVERY, Map.of("email", EMAIL));
        String token = mailedToken();
        jdbcTemplate.update("update password_reset_tokens set expires_at = now() - interval '1 minute'");

        // Act
        ResponseEntity<String> response = post(RESET, reset(token, NEW_PASSWORD));

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals(InvalidPasswordResetTokenException.MESSAGE, json(response).get("message").asString());
        assertEquals(HttpStatus.OK, post(LOGIN, Map.of("email", EMAIL, "password", RAW_PASSWORD)).getStatusCode());
    }

    @Test
    void shouldReturn400WithTheFieldWhenThePasswordBreaksThePolicyAndKeepTheTokenUsable() {
        // Arrange
        post(RECOVERY, Map.of("email", EMAIL));
        String token = mailedToken();

        // Act
        ResponseEntity<String> response = post(RESET, reset(token, "corta"));

        // Assert: el error es del campo y el enlace sigue sirviendo
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals(VALIDATION_MESSAGE, body.get("message").asString());
        assertEquals("newPassword", body.get("fieldErrors").get(0).get("field").asString());
        assertFalse(jdbcTemplate.queryForObject("select used_at is not null from password_reset_tokens",
                Boolean.class));
        assertEquals(HttpStatus.NO_CONTENT, post(RESET, reset(token, NEW_PASSWORD)).getStatusCode());
    }

    // ---------- helpers ----------

    private String mailedToken() {
        ArgumentCaptor<String> link = ArgumentCaptor.forClass(String.class);
        verify(mailer, atLeastOnce()).send(eq(ana), link.capture(), eq(properties.tokenTtl()));
        String prefix = properties.resetUrl() + "?token=";
        String last = link.getValue();
        assertTrue(last.startsWith(prefix), last);
        return last.substring(prefix.length());
    }

    private static Map<String, String> reset(String token, String newPassword) {
        return Map.of("token", token, "newPassword", newPassword);
    }

    private ResponseEntity<String> post(String uri, Object body) {
        return client.post()
                .uri(uri)
                .contentType(MediaType.APPLICATION_JSON)
                .body(jsonMapper.writeValueAsString(body))
                .retrieve()
                .onStatus(status -> true, (req, res) -> {
                })
                .toEntity(String.class);
    }

    private JsonNode json(ResponseEntity<String> response) {
        return jsonMapper.readTree(response.getBody());
    }

    private int countTokens() {
        return jdbcTemplate.queryForObject("select count(*) from password_reset_tokens", Integer.class);
    }
}
