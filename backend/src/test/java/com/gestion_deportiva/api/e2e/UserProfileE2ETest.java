package com.gestion_deportiva.api.e2e;

import com.gestion_deportiva.api.TestcontainersConfiguration;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.repository.AthleteRepository;
import com.gestion_deportiva.api.storage.ObjectStorage;
import com.gestion_deportiva.api.storage.SignedUrl;
import com.gestion_deportiva.api.storage.StorageUnavailableException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.Map;
import java.util.UUID;

import static com.gestion_deportiva.api.support.IdentityFixtures.RAW_PASSWORD;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

// US-48 · Perfil propio de punta a punta (contrato 18): datos, email, contraseña y foto, para los dos roles. Storage
// está simulado (el adaptador real no se prueba contra la red). Sin @Transactional: las requests corren en otro hilo,
// así que la limpieza es a mano
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
class UserProfileE2ETest {

    private static final String COACH_EMAIL = "ana@test.com";
    private static final String OTHER_COACH_EMAIL = "bea@test.com";
    private static final String ATHLETE_EMAIL = "leo@test.com";

    private static final String PROFILE = "/api/users/me/profile";
    private static final String PASSWORD = "/api/users/me/password";
    private static final String PHOTO = "/api/users/me/photo";

    private static final String UNAUTHORIZED_MESSAGE = "Debe iniciar sesión para acceder a este recurso";
    private static final String VALIDATION_MESSAGE = "La solicitud tiene campos inválidos";
    private static final String STORAGE_UNAVAILABLE_MESSAGE =
            "El servicio de almacenamiento no está disponible. Intente nuevamente más tarde";
    private static final String TOO_LARGE_MESSAGE = "La foto supera el tamaño máximo permitido de 5 MB";
    private static final String UNSUPPORTED_FORMAT_MESSAGE = "Formato no permitido. Subí una foto en JPG, PNG o WebP";
    private static final String DISABLED_MESSAGE = "Tu cuenta está desactivada";
    private static final String SESSION_EXPIRED_MESSAGE = "La sesión expiró. Iniciá sesión nuevamente";

    private static final long MB = 1024L * 1024L;

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

    @MockitoBean
    private ObjectStorage objectStorage;

    private RestClient client;

    private Coach ana;

    private Athlete leo;

    @BeforeEach
    void setUp() {
        client = RestClient.create("http://localhost:" + port);
        ana = coachRepository.saveAndFlush(new Coach("Ana", "Paz", COACH_EMAIL, passwordEncoder.encode(RAW_PASSWORD)));
        coachRepository.saveAndFlush(new Coach("Bea", "Ruiz", OTHER_COACH_EMAIL, passwordEncoder.encode(RAW_PASSWORD)));
        leo = athleteRepository.saveAndFlush(
                new Athlete("Leo", "Gil", ATHLETE_EMAIL, passwordEncoder.encode(RAW_PASSWORD), ana));
        when(objectStorage.createSignedUrl(anyString()))
                .thenAnswer(inv -> signedUrl(inv.getArgument(0)));
    }

    // Sin @Transactional (la request corre en otro hilo): se limpia a mano. CASCADE vacía también coaches y athletes
    @AfterEach
    void cleanUp() {
        jdbcTemplate.execute("TRUNCATE users CASCADE");
    }

    // ---------- lectura ----------

    @Test
    void shouldAnswerTheProfileOfTheAthleteWithoutSensitiveFields() {
        String token = login(ATHLETE_EMAIL, RAW_PASSWORD);

        ResponseEntity<String> response = call(HttpMethod.GET, PROFILE, token, null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals(leo.getId().toString(), body.get("id").asString());
        assertEquals("ATHLETE", body.get("role").asString());
        assertEquals("Leo", body.get("firstName").asString());
        assertEquals(ATHLETE_EMAIL, body.get("email").asString());
        assertTrue(body.get("photoUrl").isNull());
        assertFalse(body.has("passwordHash"));
        assertFalse(body.has("profilePhotoPath"));
    }

    @Test
    void shouldAnswerTheProfileOfTheCoach() {
        String token = login(COACH_EMAIL, RAW_PASSWORD);

        JsonNode body = json(call(HttpMethod.GET, PROFILE, token, null));

        assertEquals("COACH", body.get("role").asString());
        assertEquals(ana.getId().toString(), body.get("id").asString());
    }

    @Test
    void shouldRequireAToken() {
        assertEquals(HttpStatus.UNAUTHORIZED, call(HttpMethod.GET, PROFILE, null, null).getStatusCode());
        assertEquals(HttpStatus.UNAUTHORIZED, call(HttpMethod.PUT, PROFILE, null, "{}").getStatusCode());
        assertEquals(HttpStatus.UNAUTHORIZED, call(HttpMethod.PUT, PASSWORD, null, "{}").getStatusCode());
        assertEquals(HttpStatus.UNAUTHORIZED, call(HttpMethod.DELETE, PHOTO, null, null).getStatusCode());
    }

    @Test
    void shouldAnswer401WhenTheUserWasDeletedAfterTheTokenWasIssued() {
        String token = login(ATHLETE_EMAIL, RAW_PASSWORD);
        jdbcTemplate.update("update users set active = false, deleted_at = now() where id = ?::uuid",
                leo.getId().toString());

        ResponseEntity<String> response = call(HttpMethod.GET, PROFILE, token, null);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertEquals(SESSION_EXPIRED_MESSAGE, json(response).get("message").asString());
    }

    @Test
    void shouldAnswer403WhenTheAccountWasDeactivatedAfterTheTokenWasIssued() {
        String token = login(ATHLETE_EMAIL, RAW_PASSWORD);
        jdbcTemplate.update("update users set active = false where id = ?::uuid", leo.getId().toString());

        ResponseEntity<String> response = call(HttpMethod.GET, PROFILE, token, null);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals(DISABLED_MESSAGE, json(response).get("message").asString());
    }

    // ---------- datos personales ----------

    @Test
    void shouldSaveTheProfileStoringTheEmailInLowerCaseAndAnswerTheSavedData() {
        String token = login(ATHLETE_EMAIL, RAW_PASSWORD);

        ResponseEntity<String> response = call(HttpMethod.PUT, PROFILE, token, jsonOf(Map.of(
                "firstName", "Leonardo", "lastName", "Gil", "email", "Leo.Nuevo@Test.com", "phone", "+54 11 3333-3333")));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals("leo.nuevo@test.com", body.get("email").asString());
        assertEquals("+54 11 3333-3333", body.get("phone").asString());
        assertEquals("leo.nuevo@test.com", jdbcTemplate.queryForObject(
                "select email from users where id = ?::uuid", String.class, leo.getId().toString()));
    }

    @Test
    void shouldStoreABlankPhoneAsNull() {
        String token = login(ATHLETE_EMAIL, RAW_PASSWORD);

        JsonNode body = json(call(HttpMethod.PUT, PROFILE, token, jsonOf(Map.of(
                "firstName", "Leo", "lastName", "Gil", "email", ATHLETE_EMAIL, "phone", "   "))));

        assertTrue(body.get("phone").isNull());
    }

    // Cambiar el email no cierra la sesión (el token se identifica por id): /auth/me sigue respondiendo
    @Test
    void shouldKeepTheSessionAfterChangingTheEmail() {
        String token = login(ATHLETE_EMAIL, RAW_PASSWORD);

        call(HttpMethod.PUT, PROFILE, token, jsonOf(Map.of(
                "firstName", "Leo", "lastName", "Gil", "email", "leo.nuevo@test.com")));

        ResponseEntity<String> me = call(HttpMethod.GET, "/api/auth/me", token, null);
        assertEquals(HttpStatus.OK, me.getStatusCode());
        assertEquals("leo.nuevo@test.com", json(me).get("email").asString());
    }

    @Test
    void shouldLogInOnlyWithTheNewEmailAfterChangingIt() {
        String token = login(ATHLETE_EMAIL, RAW_PASSWORD);
        call(HttpMethod.PUT, PROFILE, token, jsonOf(Map.of(
                "firstName", "Leo", "lastName", "Gil", "email", "leo.nuevo@test.com")));

        assertEquals(HttpStatus.OK, loginStatus("leo.nuevo@test.com", RAW_PASSWORD));
        assertEquals(HttpStatus.UNAUTHORIZED, loginStatus(ATHLETE_EMAIL, RAW_PASSWORD));
    }

    @Test
    void shouldAnswer409WhenTheEmailBelongsToAnotherUserAndKeepTheOldOne() {
        String token = login(ATHLETE_EMAIL, RAW_PASSWORD);

        ResponseEntity<String> response = call(HttpMethod.PUT, PROFILE, token, jsonOf(Map.of(
                "firstName", "Leo", "lastName", "Gil", "email", "BEA@test.com")));

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertTrue(json(response).get("message").asString().contains("bea@test.com"));
        assertFalse(json(response).has("fieldErrors"));
        assertEquals(ATHLETE_EMAIL, jdbcTemplate.queryForObject(
                "select email from users where id = ?::uuid", String.class, leo.getId().toString()));
    }

    @Test
    void shouldAcceptTheSameEmailTheUserAlreadyHas() {
        String token = login(ATHLETE_EMAIL, RAW_PASSWORD);

        ResponseEntity<String> response = call(HttpMethod.PUT, PROFILE, token, jsonOf(Map.of(
                "firstName", "Leonardo", "lastName", "Gil", "email", ATHLETE_EMAIL)));

        assertEquals(HttpStatus.OK, response.getStatusCode());
    }

    @Test
    void shouldAnswer400WithFieldErrorsForInvalidProfileData() {
        String token = login(ATHLETE_EMAIL, RAW_PASSWORD);

        ResponseEntity<String> response = call(HttpMethod.PUT, PROFILE, token, jsonOf(Map.of(
                "firstName", " ", "lastName", "Gil", "email", "no-es-email", "phone", "1".repeat(31))));

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals(VALIDATION_MESSAGE, body.get("message").asString());
        String fieldErrors = body.get("fieldErrors").toString();
        assertTrue(fieldErrors.contains("\"field\":\"firstName\""), fieldErrors);
        assertTrue(fieldErrors.contains("\"field\":\"email\""), fieldErrors);
        assertTrue(fieldErrors.contains("\"field\":\"phone\""), fieldErrors);
    }

    // ---------- contraseña ----------

    @Test
    void shouldChangeThePasswordKeepingTheSessionAndRejectingTheOldOne() {
        String token = login(ATHLETE_EMAIL, RAW_PASSWORD);

        ResponseEntity<String> response = call(HttpMethod.PUT, PASSWORD, token, jsonOf(Map.of(
                "currentPassword", RAW_PASSWORD, "newPassword", "nueva-clave-2026")));

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        assertEquals(HttpStatus.OK, loginStatus(ATHLETE_EMAIL, "nueva-clave-2026"));
        assertEquals(HttpStatus.UNAUTHORIZED, loginStatus(ATHLETE_EMAIL, RAW_PASSWORD));
        assertEquals(HttpStatus.OK, call(HttpMethod.GET, "/api/auth/me", token, null).getStatusCode());
    }

    @Test
    void shouldAnswer400OnCurrentPasswordWhenItDoesNotMatch() {
        String token = login(ATHLETE_EMAIL, RAW_PASSWORD);

        ResponseEntity<String> response = call(HttpMethod.PUT, PASSWORD, token, jsonOf(Map.of(
                "currentPassword", "otra-clave-1", "newPassword", "nueva-clave-2026")));

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertFieldError(response, "currentPassword", "La contraseña actual no es correcta");
        assertEquals(HttpStatus.OK, loginStatus(ATHLETE_EMAIL, RAW_PASSWORD));
    }

    @Test
    void shouldAnswer400OnNewPasswordWhenItEqualsTheCurrentOne() {
        String token = login(ATHLETE_EMAIL, RAW_PASSWORD);

        ResponseEntity<String> response = call(HttpMethod.PUT, PASSWORD, token, jsonOf(Map.of(
                "currentPassword", RAW_PASSWORD, "newPassword", RAW_PASSWORD)));

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertFieldError(response, "newPassword", "La nueva contraseña debe ser distinta de la actual");
    }

    @Test
    void shouldApplyTheSignUpPasswordPolicyToTheNewPassword() {
        String token = login(COACH_EMAIL, RAW_PASSWORD);

        ResponseEntity<String> response = call(HttpMethod.PUT, PASSWORD, token, jsonOf(Map.of(
                "currentPassword", RAW_PASSWORD, "newPassword", "corta")));

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertFieldError(response, "newPassword", "La nueva contraseña debe tener al menos 8 caracteres");
    }

    // ---------- foto de perfil ----------

    @Test
    void shouldStoreTheImageUnderTheProfilePrefixAndAnswerASignedUrl() throws IOException {
        String token = login(ATHLETE_EMAIL, RAW_PASSWORD);

        ResponseEntity<String> response = uploadPhoto(token, photoParts(load("foto-valida.png"), "frente.jpg"));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        JsonNode body = json(response);
        assertTrue(body.get("photoUrl").asString().startsWith("https://signed.test/profile-photos/" + leo.getId() + "/"));
        assertTrue(body.hasNonNull("photoUrlExpiresAt"));
        assertFalse(body.has("profilePhotoPath"));

        ArgumentCaptor<String> path = ArgumentCaptor.forClass(String.class);
        verify(objectStorage).upload(path.capture(), any(), eq("image/png"));
        assertTrue(path.getValue().startsWith("profile-photos/" + leo.getId() + "/"), path.getValue());
        assertTrue(path.getValue().endsWith(".png"), path.getValue());
        assertEquals(path.getValue(), storedPhotoPath(leo.getId()));
    }

    @Test
    void shouldShowThePhotoOnTheNextRead() throws IOException {
        String token = login(ATHLETE_EMAIL, RAW_PASSWORD);
        uploadPhoto(token, photoParts(load("foto-valida.jpg"), "frente.jpg"));

        JsonNode body = json(call(HttpMethod.GET, PROFILE, token, null));

        assertTrue(body.get("photoUrl").asString().startsWith("https://signed.test/profile-photos/"));
    }

    @Test
    void shouldReplaceThePhotoAndDeleteThePreviousObject() throws IOException {
        String token = login(ATHLETE_EMAIL, RAW_PASSWORD);
        uploadPhoto(token, photoParts(load("foto-valida.jpg"), "primera.jpg"));
        ArgumentCaptor<String> first = ArgumentCaptor.forClass(String.class);
        verify(objectStorage).upload(first.capture(), any(), eq("image/jpeg"));

        ResponseEntity<String> response = uploadPhoto(token, photoParts(load("foto-valida.webp"), "segunda.webp"));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(objectStorage).delete(first.getValue());
        String current = storedPhotoPath(leo.getId());
        assertNotEquals(first.getValue(), current);
        assertTrue(current.endsWith(".webp"), current);
    }

    @Test
    void shouldAllowTheCoachToUploadHisOwnPhoto() throws IOException {
        String token = login(COACH_EMAIL, RAW_PASSWORD);

        ResponseEntity<String> response = uploadPhoto(token, photoParts(load("foto-valida.jpg"), "ana.jpg"));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(storedPhotoPath(ana.getId()).startsWith("profile-photos/" + ana.getId() + "/"));
    }

    @Test
    void shouldAnswer415AndStoreNothingForAFileThatIsNotAnImage() {
        String token = login(ATHLETE_EMAIL, RAW_PASSWORD);

        ResponseEntity<String> response = uploadPhoto(token,
                photoParts("hola mundo".getBytes(), "nota.jpg"));

        assertEquals(HttpStatus.UNSUPPORTED_MEDIA_TYPE, response.getStatusCode());
        assertEquals(UNSUPPORTED_FORMAT_MESSAGE, json(response).get("message").asString());
        verify(objectStorage, never()).upload(anyString(), any(), anyString());
        assertNull(storedPhotoPath(leo.getId()));
    }

    @Test
    void shouldAnswer413AndStoreNothingForAnImageOverFiveMegabytes() throws IOException {
        String token = login(ATHLETE_EMAIL, RAW_PASSWORD);

        ResponseEntity<String> response = uploadPhoto(token,
                photoParts(padded(load("foto-valida.jpg"), 5 * MB + 1), "grande.jpg"));

        assertEquals(HttpStatus.CONTENT_TOO_LARGE, response.getStatusCode());
        assertEquals(TOO_LARGE_MESSAGE, json(response).get("message").asString());
        verify(objectStorage, never()).upload(anyString(), any(), anyString());
    }

    @Test
    void shouldAnswer400OnTheFileWhenItIsMissing() {
        String token = login(ATHLETE_EMAIL, RAW_PASSWORD);
        MultiValueMap<String, Object> parts = new LinkedMultiValueMap<>();
        parts.add("otro", "sin archivo");

        ResponseEntity<String> response = uploadPhoto(token, parts);

        assertFieldError(response, "file", "Adjuntá una foto");
        verify(objectStorage, never()).upload(anyString(), any(), anyString());
    }

    @Test
    void shouldAnswer503AndKeepThePreviousPhotoWhenTheUploadFails() throws IOException {
        String token = login(ATHLETE_EMAIL, RAW_PASSWORD);
        doThrow(new StorageUnavailableException("caído")).when(objectStorage).upload(anyString(), any(), anyString());

        ResponseEntity<String> response = uploadPhoto(token, photoParts(load("foto-valida.jpg"), "frente.jpg"));

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        assertEquals(STORAGE_UNAVAILABLE_MESSAGE, json(response).get("message").asString());
        assertNull(storedPhotoPath(leo.getId()));
    }

    // Subió, pero no se pudo firmar: el objeto recién subido se borra y la base no cambia
    @Test
    void shouldAnswer503AndDeleteTheNewObjectWhenSigningFails() throws IOException {
        String token = login(ATHLETE_EMAIL, RAW_PASSWORD);
        when(objectStorage.createSignedUrl(anyString())).thenThrow(new StorageUnavailableException("caído"));

        ResponseEntity<String> response = uploadPhoto(token, photoParts(load("foto-valida.jpg"), "frente.jpg"));

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        ArgumentCaptor<String> uploaded = ArgumentCaptor.forClass(String.class);
        verify(objectStorage).upload(uploaded.capture(), any(), eq("image/jpeg"));
        verify(objectStorage).delete(uploaded.getValue());
        assertNull(storedPhotoPath(leo.getId()));
    }

    @Test
    void shouldDeleteThePhotoAndTheObjectAnswering204() throws IOException {
        String token = login(ATHLETE_EMAIL, RAW_PASSWORD);
        uploadPhoto(token, photoParts(load("foto-valida.jpg"), "frente.jpg"));
        ArgumentCaptor<String> uploaded = ArgumentCaptor.forClass(String.class);
        verify(objectStorage).upload(uploaded.capture(), any(), eq("image/jpeg"));

        ResponseEntity<String> response = call(HttpMethod.DELETE, PHOTO, token, null);

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(objectStorage).delete(uploaded.getValue());
        assertNull(storedPhotoPath(leo.getId()));
        assertTrue(json(call(HttpMethod.GET, PROFILE, token, null)).get("photoUrl").isNull());
    }

    // Idempotente: una segunda vez responde 204 y no llama a Storage
    @Test
    void shouldAnswer204WithoutStorageCallsWhenThereIsNoPhoto() {
        String token = login(ATHLETE_EMAIL, RAW_PASSWORD);

        assertEquals(HttpStatus.NO_CONTENT, call(HttpMethod.DELETE, PHOTO, token, null).getStatusCode());
        assertEquals(HttpStatus.NO_CONTENT, call(HttpMethod.DELETE, PHOTO, token, null).getStatusCode());
        verify(objectStorage, never()).delete(anyString());
    }

    // La fila ya quedó sin foto: si Storage no borra el objeto, la respuesta sigue siendo 204 (queda en el log)
    @Test
    void shouldAnswer204EvenWhenStorageCannotDeleteTheObject() throws IOException {
        String token = login(ATHLETE_EMAIL, RAW_PASSWORD);
        uploadPhoto(token, photoParts(load("foto-valida.jpg"), "frente.jpg"));
        doThrow(new StorageUnavailableException("caído")).when(objectStorage).delete(anyString());

        ResponseEntity<String> response = call(HttpMethod.DELETE, PHOTO, token, null);

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        assertNull(storedPhotoPath(leo.getId()));
        verify(objectStorage, times(1)).delete(anyString());
    }

    // Storage caído en una lectura: el perfil responde 200 sin foto (contrato 18.3)
    @Test
    void shouldAnswerTheProfileWithoutPhotoWhenStorageCannotSign() throws IOException {
        String token = login(ATHLETE_EMAIL, RAW_PASSWORD);
        uploadPhoto(token, photoParts(load("foto-valida.jpg"), "frente.jpg"));
        when(objectStorage.createSignedUrl(anyString())).thenThrow(new StorageUnavailableException("caído"));

        ResponseEntity<String> response = call(HttpMethod.GET, PROFILE, token, null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(json(response).get("photoUrl").isNull());
        assertEquals(leo.getId().toString(), json(response).get("id").asString());
    }

    @Test
    void shouldRequireATokenToUploadOrDeleteAPhoto() throws IOException {
        ResponseEntity<String> upload = uploadPhoto(null, photoParts(load("foto-valida.jpg"), "frente.jpg"));

        assertEquals(HttpStatus.UNAUTHORIZED, upload.getStatusCode());
        assertEquals(UNAUTHORIZED_MESSAGE, json(upload).get("message").asString());
        verifyNoInteractions(objectStorage);
    }

    // ---------- helpers ----------

    private ResponseEntity<String> call(HttpMethod method, String path, String token, String jsonBody) {
        RestClient.RequestBodySpec request = client.method(method).uri(path)
                .headers(headers -> {
                    if (token != null) {
                        headers.setBearerAuth(token);
                    }
                });
        if (jsonBody != null) {
            request = request.contentType(MediaType.APPLICATION_JSON).body(jsonBody);
        }
        return request.retrieve()
                .onStatus(status -> true, (req, res) -> {
                })
                .toEntity(String.class);
    }

    private ResponseEntity<String> uploadPhoto(String token, MultiValueMap<String, Object> parts) {
        RestClient.RequestBodySpec request = client.put().uri(PHOTO)
                .headers(headers -> {
                    if (token != null) {
                        headers.setBearerAuth(token);
                    }
                })
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(parts);
        return request.retrieve()
                .onStatus(status -> true, (req, res) -> {
                })
                .toEntity(String.class);
    }

    private String login(String email, String password) {
        ResponseEntity<String> response = client.post()
                .uri("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .body(jsonOf(Map.of("email", email, "password", password)))
                .retrieve()
                .onStatus(status -> true, (req, res) -> {
                })
                .toEntity(String.class);
        assertEquals(HttpStatus.OK, response.getStatusCode(), "login de " + email);
        return json(response).get("accessToken").asString();
    }

    private HttpStatus loginStatus(String email, String password) {
        return HttpStatus.valueOf(client.post()
                .uri("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .body(jsonOf(Map.of("email", email, "password", password)))
                .retrieve()
                .onStatus(status -> true, (req, res) -> {
                })
                .toEntity(String.class).getStatusCode().value());
    }

    private void assertFieldError(ResponseEntity<String> response, String field, String message) {
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals(VALIDATION_MESSAGE, body.get("message").asString());
        String fieldErrors = body.get("fieldErrors").toString();
        assertTrue(fieldErrors.contains("\"field\":\"" + field + "\""), fieldErrors);
        assertTrue(fieldErrors.contains(message), fieldErrors);
    }

    private String storedPhotoPath(UUID userId) {
        return jdbcTemplate.queryForObject("select profile_photo_path from users where id = ?::uuid", String.class,
                userId.toString());
    }

    private String jsonOf(Map<String, String> body) {
        return jsonMapper.writeValueAsString(body);
    }

    private static MultiValueMap<String, Object> photoParts(byte[] content, String filename) {
        MultiValueMap<String, Object> parts = new LinkedMultiValueMap<>();
        parts.add("file", named(content, filename));
        return parts;
    }

    // Un recurso con nombre de archivo: así el part multipart lleva "filename" como un navegador
    private static Resource named(byte[] content, String filename) {
        return new ByteArrayResource(content) {
            @Override
            public String getFilename() {
                return filename;
            }
        };
    }

    private static byte[] load(String name) throws IOException {
        return new ClassPathResource("images/" + name).getContentAsByteArray();
    }

    // Rellena con ceros al final: la cabecera sigue siendo la de la imagen válida
    private static byte[] padded(byte[] content, long size) {
        return Arrays.copyOf(content, (int) size);
    }

    private static SignedUrl signedUrl(String path) {
        return new SignedUrl("https://signed.test/" + path + "?token=token-1",
                Instant.now().plus(Duration.ofMinutes(10)));
    }

    private JsonNode json(ResponseEntity<String> response) {
        assertNotNull(response.getBody());
        return jsonMapper.readTree(response.getBody());
    }
}
