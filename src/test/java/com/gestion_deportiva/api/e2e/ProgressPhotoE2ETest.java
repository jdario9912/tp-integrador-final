package com.gestion_deportiva.api.e2e;

import com.gestion_deportiva.api.TestcontainersConfiguration;
import com.gestion_deportiva.api.athlete.exception.AthleteAccessDeniedException;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.repository.AthleteRepository;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
import com.gestion_deportiva.api.config.TimeZoneProperties;
import com.gestion_deportiva.api.photo.model.ProgressPhoto;
import com.gestion_deportiva.api.photo.model.enums.ProgressPhotoType;
import com.gestion_deportiva.api.photo.repository.ProgressPhotoRepository;
import com.gestion_deportiva.api.storage.ObjectStorage;
import com.gestion_deportiva.api.storage.SignedUrl;
import com.gestion_deportiva.api.storage.StorageUnavailableException;
import com.gestion_deportiva.api.support.AuthHeaders;
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
import org.springframework.http.HttpHeaders;
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
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.gestion_deportiva.api.support.IdentityFixtures.RAW_PASSWORD;
import static com.gestion_deportiva.api.support.ProgressPhotoFixtures.progressPhoto;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

// Fotos de progreso (US-28) de punta a punta: roles, pertenencia, validación del archivo, compensación con Storage y
// borrado. ObjectStorage está simulado (el adaptador real no se prueba contra la red). Sin @Transactional: la request
// corre en otro hilo, así que la limpieza es a mano
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
class ProgressPhotoE2ETest {

    private static final String COACH_EMAIL = "ana@test.com";
    private static final String OTHER_COACH_EMAIL = "bea@test.com";
    private static final String ATHLETE_EMAIL = "leo@test.com";
    private static final String OTHER_ATHLETE_EMAIL = "mia@test.com";
    private static final String ATHLETE_OF_OTHER_COACH_EMAIL = "ivo@test.com";

    private static final String VALIDATION_MESSAGE = "La solicitud tiene campos inválidos";
    private static final String UNAUTHORIZED_MESSAGE = "Debe iniciar sesión para acceder a este recurso";
    private static final String ROLE_FORBIDDEN_MESSAGE = "No tiene permisos para acceder a este recurso";
    private static final String STORAGE_UNAVAILABLE_MESSAGE =
            "El servicio de almacenamiento no está disponible. Intente nuevamente más tarde";
    private static final String TOO_LARGE_MESSAGE = "La foto supera el tamaño máximo permitido de 5 MB";
    private static final String UNSUPPORTED_FORMAT_MESSAGE = "Formato no permitido. Subí una foto en JPG, PNG o WebP";

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

    @Autowired
    private ProgressPhotoRepository progressPhotoRepository;

    @Autowired
    private TimeZoneProperties timeZoneProperties;

    @MockitoBean
    private ObjectStorage objectStorage;

    private RestClient client;

    private Coach ana;

    private Athlete leo;

    private Athlete mia;

    @BeforeEach
    void setUp() {
        client = RestClient.create("http://localhost:" + port);
        ana = saveCoach("Ana", COACH_EMAIL);
        Coach bea = saveCoach("Bea", OTHER_COACH_EMAIL);
        leo = saveAthlete(ATHLETE_EMAIL, ana);
        mia = saveAthlete(OTHER_ATHLETE_EMAIL, ana);
        saveAthlete(ATHLETE_OF_OTHER_COACH_EMAIL, bea);
        // Storage devuelve una URL firmada para cada ruta (la de la lectura y la de la lista). Sin objeto, nada se borra
        when(objectStorage.createSignedUrl(anyString()))
                .thenAnswer(inv -> signedUrl(inv.getArgument(0), "token-1"));
        when(objectStorage.createSignedUrls(anyList())).thenAnswer(inv -> {
            List<String> paths = inv.getArgument(0);
            return paths.stream().map(path -> signedUrl(path, "token-lote")).toList();
        });
    }

    // Sin @Transactional (la request corre en otro hilo): se limpia a mano. CASCADE vacía también athletes y fotos
    @AfterEach
    void cleanUp() {
        jdbcTemplate.execute("TRUNCATE users CASCADE");
    }

    // ---------- POST: subida ----------

    @Test
    void shouldStoreTheImageInTheBucketAndAnswer201WithLocationAndASignedUrl() throws IOException {
        // Act
        ResponseEntity<String> response = upload(leo, ATHLETE_EMAIL, photoParts(load("foto-valida.jpg"), "frente.jpg",
                "FRONT", "2026-11-12"));

        // Assert: respuesta (la URL firmada, nunca la ruta del objeto)
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        JsonNode body = json(response);
        String id = body.get("id").asString();
        assertTrue(response.getHeaders().getLocation().toString().endsWith("/photos/" + id));
        assertEquals("FRONT", body.get("type").asString());
        assertEquals("2026-11-12", body.get("takenOn").asString());
        assertTrue(body.get("url").asString().startsWith("https://signed.test/progress/" + leo.getId() + "/"));
        assertTrue(body.hasNonNull("urlExpiresAt"));
        assertTrue(body.hasNonNull("createdAt"));
        assertFalse(body.has("storagePath"));
        assertFalse(body.has("athleteId"));

        // Assert: el objeto se subió al bucket con el tipo detectado, y la fila apunta a esa ruta
        ArgumentCaptor<String> path = ArgumentCaptor.forClass(String.class);
        verify(objectStorage).upload(path.capture(), any(), eq("image/jpeg"));
        assertTrue(path.getValue().startsWith("progress/" + leo.getId() + "/"), path.getValue());
        assertTrue(path.getValue().endsWith(".jpg"), path.getValue());
        Map<String, Object> row = jdbcTemplate.queryForMap(
                "select storage_path, type_id, taken_on from progress_photos where id = ?::uuid", id);
        assertEquals(path.getValue(), row.get("storage_path"));
        assertEquals((short) 1, ((Number) row.get("type_id")).shortValue());
    }

    @Test
    void shouldKeepTheFormatDetectedFromTheContentNotTheNameTheClientSent() throws IOException {
        ResponseEntity<String> response = upload(leo, ATHLETE_EMAIL, photoParts(load("foto-valida.png"), "frente.jpg",
                "SIDE", null));

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        ArgumentCaptor<String> path = ArgumentCaptor.forClass(String.class);
        verify(objectStorage).upload(path.capture(), any(), eq("image/png"));
        assertTrue(path.getValue().endsWith(".png"), path.getValue());
    }

    @Test
    void shouldDefaultTakenOnToTodayInTheAppZone() throws IOException {
        ResponseEntity<String> response = upload(leo, ATHLETE_EMAIL, photoParts(load("foto-valida.webp"), "frente.webp",
                "BACK", null));

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals(LocalDate.now(timeZoneProperties.zoneId()).toString(), json(response).get("takenOn").asString());
    }

    @Test
    void shouldAnswer400WithTheFieldErrorsForAMissingFileOrAnUnknownType() throws IOException {
        ResponseEntity<String> noFile = upload(leo, ATHLETE_EMAIL, photoParts(null, null, "FRONT", null));
        ResponseEntity<String> unknownType = upload(leo, ATHLETE_EMAIL,
                photoParts(load("foto-valida.jpg"), "frente.jpg", "FRONTAL", null));

        assertBadRequestWithField(noFile, "file", "Adjuntá una foto");
        assertBadRequestWithField(unknownType, "type", "El tipo de foto no es válido");
        verify(objectStorage, never()).upload(anyString(), any(), anyString());
    }

    @Test
    void shouldAnswer400WithTheFieldErrorForATakenOnInAnotherFormatOrInTheFuture() throws IOException {
        ResponseEntity<String> wrongFormat = upload(leo, ATHLETE_EMAIL,
                photoParts(load("foto-valida.jpg"), "frente.jpg", "FRONT", "12/11/2026"));
        ResponseEntity<String> future = upload(leo, ATHLETE_EMAIL,
                photoParts(load("foto-valida.jpg"), "frente.jpg", "FRONT", "2999-01-01"));

        assertBadRequestWithField(wrongFormat, "takenOn", "La fecha debe tener el formato AAAA-MM-DD");
        assertBadRequestWithField(future, "takenOn", "La fecha no puede ser futura");
        verify(objectStorage, never()).upload(anyString(), any(), anyString());
    }

    @Test
    void shouldAnswer415ForAGifEvenWhenItIsNamedJpg() throws IOException {
        ResponseEntity<String> response = upload(leo, ATHLETE_EMAIL,
                photoParts(load("animacion.gif"), "foto.jpg", "FRONT", null));

        assertEquals(HttpStatus.UNSUPPORTED_MEDIA_TYPE, response.getStatusCode());
        assertEquals(UNSUPPORTED_FORMAT_MESSAGE, json(response).get("message").asString());
        assertFalse(json(response).has("fieldErrors"));
        verify(objectStorage, never()).upload(anyString(), any(), anyString());
    }

    @Test
    void shouldAnswer400ForAJpegTruncatedInTheHeader() throws IOException {
        byte[] truncated = Arrays.copyOf(load("foto-valida.jpg"), 40);

        ResponseEntity<String> response = upload(leo, ATHLETE_EMAIL,
                photoParts(truncated, "cortada.jpg", "FRONT", null));

        assertBadRequestWithField(response, "file", "El archivo no es una imagen válida. Probá con otra foto");
        verify(objectStorage, never()).upload(anyString(), any(), anyString());
    }

    @Test
    void shouldAnswer413AndStoreNothingForAnImageOverTheFiveMegabytePolicy() throws IOException {
        byte[] tooLarge = padded(load("foto-valida.jpg"), 5 * MB + 1);

        ResponseEntity<String> response = upload(leo, ATHLETE_EMAIL,
                photoParts(tooLarge, "grande.jpg", "FRONT", null));

        assertEquals(HttpStatus.CONTENT_TOO_LARGE, response.getStatusCode());
        assertEquals(TOO_LARGE_MESSAGE, json(response).get("message").asString());
        assertFalse(json(response).has("fieldErrors"));
        verify(objectStorage, never()).upload(anyString(), any(), anyString());
    }

    // Un cuerpo multipart sin partes válidas (boundary que no aparece) llega como "sin archivo": 400 de validación.
    // El 413 del tope del contenedor y el MultipartException se prueban en GlobalExceptionHandlerUploadTest, porque
    // Tomcat corta la conexión a mitad de un upload gigante y el cliente no llega a leer la respuesta
    @Test
    void shouldAnswer400WhenTheMultipartBodyHasNoPartsWeCanRead() {
        ResponseEntity<String> response = client.post()
                .uri(photosPath(leo.getId()))
                .headers(headers -> AuthHeaders.authenticate(headers, client, ATHLETE_EMAIL, RAW_PASSWORD))
                .contentType(MediaType.parseMediaType("multipart/form-data; boundary=limite"))
                .body("esto no es un cuerpo multipart")
                .retrieve()
                .onStatus(status -> true, (req, res) -> {
                })
                .toEntity(String.class);

        // Sin partes legibles no llega "type": el primer error es el de type (se valida antes que el archivo)
        assertBadRequestWithField(response, "type", "El tipo de foto no es válido");
    }

    @Test
    void shouldAnswer503AndStoreNoRowWhenTheStorageIsDownOnTheUpload() throws IOException {
        doThrow(new StorageUnavailableException("Supabase respondió 500 al subir")).when(objectStorage)
                .upload(anyString(), any(), anyString());

        ResponseEntity<String> response = upload(leo, ATHLETE_EMAIL,
                photoParts(load("foto-valida.jpg"), "frente.jpg", "FRONT", null));

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        assertEquals(STORAGE_UNAVAILABLE_MESSAGE, json(response).get("message").asString());
        assertEquals(0, countPhotosOf(leo));
        // Un timeout pudo dejar el objeto a medias: se intenta borrar la ruta
        verify(objectStorage).delete(anyString());
    }

    @Test
    void shouldAnswer503AndRemoveTheObjectWhenSigningFailsSoNoRowIsLeftBehind() throws IOException {
        doThrow(new StorageUnavailableException("firma rechazada")).when(objectStorage).createSignedUrl(anyString());

        ResponseEntity<String> response = upload(leo, ATHLETE_EMAIL,
                photoParts(load("foto-valida.jpg"), "frente.jpg", "FRONT", null));

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        ArgumentCaptor<String> uploaded = ArgumentCaptor.forClass(String.class);
        verify(objectStorage).upload(uploaded.capture(), any(), anyString());
        verify(objectStorage).delete(uploaded.getValue());
        assertEquals(0, countPhotosOf(leo));
    }

    @Test
    void shouldAnswer403WhenACoachUploadsEvenToHisOwnAthlete() throws IOException {
        ResponseEntity<String> response = upload(leo, COACH_EMAIL,
                photoParts(load("foto-valida.jpg"), "frente.jpg", "FRONT", null));

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals(ROLE_FORBIDDEN_MESSAGE, json(response).get("message").asString());
        verify(objectStorage, never()).upload(anyString(), any(), anyString());
    }

    @Test
    void shouldAnswer403WhenTheAthleteUploadsToAnotherAthlete() throws IOException {
        ResponseEntity<String> response = upload(mia, ATHLETE_EMAIL,
                photoParts(load("foto-valida.jpg"), "frente.jpg", "FRONT", null));

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals(AthleteAccessDeniedException.MESSAGE, json(response).get("message").asString());
        verify(objectStorage, never()).upload(anyString(), any(), anyString());
    }

    @Test
    void shouldAnswer404ForAnUnknownAthlete() throws IOException {
        UUID unknown = UUID.randomUUID();

        ResponseEntity<String> response = upload(unknown, ATHLETE_EMAIL,
                photoParts(load("foto-valida.jpg"), "frente.jpg", "FRONT", null));

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertEquals("No existe el atleta con id " + unknown, json(response).get("message").asString());
    }

    @Test
    void shouldAnswer401WithoutAToken() throws IOException {
        ResponseEntity<String> response = client.post()
                .uri(photosPath(leo.getId()))
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(photoParts(load("foto-valida.jpg"), "frente.jpg", "FRONT", null))
                .retrieve()
                .onStatus(status -> true, (req, res) -> {
                })
                .toEntity(String.class);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertEquals(UNAUTHORIZED_MESSAGE, json(response).get("message").asString());
    }

    // ---------- GET: listado ----------

    @Test
    void shouldListThePhotosOldestFirstForTheAthleteAndHisCoach() {
        ProgressPhoto november = saveProgressPhoto(leo, ProgressPhotoType.FRONT, LocalDate.of(2026, 11, 12),
                "progress/" + leo.getId() + "/noviembre.jpg");
        ProgressPhoto october = saveProgressPhoto(leo, ProgressPhotoType.SIDE, LocalDate.of(2026, 10, 3),
                "progress/" + leo.getId() + "/octubre.jpg");

        for (String email : List.of(COACH_EMAIL, ATHLETE_EMAIL)) {
            ResponseEntity<String> response = get(photosPath(leo.getId()), email);

            assertEquals(HttpStatus.OK, response.getStatusCode());
            JsonNode page = json(response);
            List<String> ids = new java.util.ArrayList<>();
            page.get("content").forEach(photo -> ids.add(photo.get("id").asString()));
            assertEquals(List.of(october.getId().toString(), november.getId().toString()), ids);
            assertTrue(page.get("content").get(0).get("url").asString().startsWith("https://signed.test/"));
            assertFalse(page.get("content").get(0).has("storagePath"));
            assertEquals(0, page.get("page").asInt());
            assertEquals(2, page.get("totalElements").asInt());
        }
    }

    @Test
    void shouldAnswer200WithAnEmptyContentAndNotCallStorageWhenThereAreNoPhotos() {
        ResponseEntity<String> response = get(photosPath(leo.getId()), ATHLETE_EMAIL);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(json(response).get("content").isEmpty());
        verify(objectStorage, never()).createSignedUrls(anyList());
    }

    @Test
    void shouldAnswer403WhenTheCoachHasNoLinkWithTheAthleteOrTheAthleteIsAnotherOne() {
        ResponseEntity<String> ofOtherCoach = get(photosPath(athleteOf(ATHLETE_OF_OTHER_COACH_EMAIL)), COACH_EMAIL);
        ResponseEntity<String> ofOtherAthlete = get(photosPath(leo.getId()), OTHER_ATHLETE_EMAIL);

        assertEquals(HttpStatus.FORBIDDEN, ofOtherCoach.getStatusCode());
        assertEquals(AthleteAccessDeniedException.MESSAGE, json(ofOtherCoach).get("message").asString());
        assertEquals(HttpStatus.FORBIDDEN, ofOtherAthlete.getStatusCode());
    }

    @Test
    void shouldAnswer400ForAnAthleteIdThatIsNotAUuid() {
        ResponseEntity<String> response = get("/api/athletes/no-es-uuid/photos", ATHLETE_EMAIL);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    // ---------- GET: detalle con URL nueva ----------

    @Test
    void shouldReturnThePhotoWithANewSignedUrlForTheCoachAndTheAthlete() {
        ProgressPhoto photo = saveProgressPhoto(leo, ProgressPhotoType.BACK, LocalDate.of(2026, 11, 12),
                "progress/" + leo.getId() + "/espalda.jpg");

        for (String email : List.of(COACH_EMAIL, ATHLETE_EMAIL)) {
            ResponseEntity<String> response = get(photoPath(leo.getId(), photo.getId()), email);

            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertEquals(photo.getId().toString(), json(response).get("id").asString());
            assertEquals("BACK", json(response).get("type").asString());
            assertTrue(json(response).get("url").asString().contains("token-1"));
        }
        verify(objectStorage, times(2)).createSignedUrl("progress/" + leo.getId() + "/espalda.jpg");
    }

    @Test
    void shouldAnswer404ForAPhotoOfAnotherAthleteOrAnUnknownId() {
        ProgressPhoto ofMia = saveProgressPhoto(mia, ProgressPhotoType.FRONT, LocalDate.of(2026, 11, 12),
                "progress/" + mia.getId() + "/mia.jpg");
        UUID unknown = UUID.randomUUID();

        ResponseEntity<String> ofAnother = get(photoPath(leo.getId(), ofMia.getId()), ATHLETE_EMAIL);
        ResponseEntity<String> missing = get(photoPath(leo.getId(), unknown), ATHLETE_EMAIL);

        assertEquals(HttpStatus.NOT_FOUND, ofAnother.getStatusCode());
        assertEquals("No existe la foto de progreso con id " + ofMia.getId(),
                json(ofAnother).get("message").asString());
        assertEquals(HttpStatus.NOT_FOUND, missing.getStatusCode());
        verify(objectStorage, never()).createSignedUrl("progress/" + mia.getId() + "/mia.jpg");
    }

    // ---------- DELETE ----------

    @Test
    void shouldDeleteTheRowAndTheObjectAndAnswer204() {
        String storagePath = "progress/" + leo.getId() + "/borrar.jpg";
        ProgressPhoto photo = saveProgressPhoto(leo, ProgressPhotoType.FRONT, LocalDate.of(2026, 11, 12), storagePath);

        ResponseEntity<String> response = delete(photoPath(leo.getId(), photo.getId()), ATHLETE_EMAIL);

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        assertEquals(0, countPhotosOf(leo));
        verify(objectStorage).delete(storagePath);
    }

    @Test
    void shouldAnswer404WhenDeletingAPhotoTwice() {
        ProgressPhoto photo = saveProgressPhoto(leo, ProgressPhotoType.FRONT, LocalDate.of(2026, 11, 12),
                "progress/" + leo.getId() + "/dos-veces.jpg");
        String path = photoPath(leo.getId(), photo.getId());

        assertEquals(HttpStatus.NO_CONTENT, delete(path, ATHLETE_EMAIL).getStatusCode());
        ResponseEntity<String> second = delete(path, ATHLETE_EMAIL);

        assertEquals(HttpStatus.NOT_FOUND, second.getStatusCode());
        verify(objectStorage, times(1)).delete(anyString());
    }

    @Test
    void shouldAnswer403AndKeepThePhotoWhenACoachOrAnotherAthleteDeletes() {
        ProgressPhoto photo = saveProgressPhoto(mia, ProgressPhotoType.FRONT, LocalDate.of(2026, 11, 12),
                "progress/" + mia.getId() + "/de-mia.jpg");

        ResponseEntity<String> byCoach = delete(photoPath(mia.getId(), photo.getId()), COACH_EMAIL);
        ResponseEntity<String> byOtherAthlete = delete(photoPath(mia.getId(), photo.getId()), ATHLETE_EMAIL);

        assertEquals(HttpStatus.FORBIDDEN, byCoach.getStatusCode());
        assertEquals(ROLE_FORBIDDEN_MESSAGE, json(byCoach).get("message").asString());
        assertEquals(HttpStatus.FORBIDDEN, byOtherAthlete.getStatusCode());
        assertEquals(1, countPhotosOf(mia));
        verify(objectStorage, never()).delete(anyString());
    }

    @Test
    void shouldStillAnswer204WhenTheObjectCannotBeRemovedAfterTheRowIsGone() {
        ProgressPhoto photo = saveProgressPhoto(leo, ProgressPhotoType.FRONT, LocalDate.of(2026, 11, 12),
                "progress/" + leo.getId() + "/huerfano.jpg");
        doThrow(new StorageUnavailableException("sin respuesta")).when(objectStorage).delete(anyString());

        ResponseEntity<String> response = delete(photoPath(leo.getId(), photo.getId()), ATHLETE_EMAIL);

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        assertEquals(0, countPhotosOf(leo));
    }

    // ---------- baja lógica ----------

    @Test
    void shouldAnswer404OnEveryEndpointForAnAthleteDeletedWhileTheTokenIsStillValid() {
        // El token se obtiene antes de la baja: el JWT no se revoca y el login ya no funciona para el atleta eliminado
        ProgressPhoto photo = saveProgressPhoto(leo, ProgressPhotoType.FRONT, LocalDate.of(2026, 11, 12),
                "progress/" + leo.getId() + "/eliminado.jpg");
        HttpHeaders tokenHeaders = new HttpHeaders();
        AuthHeaders.authenticate(tokenHeaders, client, ATHLETE_EMAIL, RAW_PASSWORD);
        jdbcTemplate.update("update users set deleted_at = now() where id = ?", leo.getId());

        assertEquals(HttpStatus.NOT_FOUND, withHeaders(HttpMethod.GET, photosPath(leo.getId()), tokenHeaders)
                .getStatusCode());
        assertEquals(HttpStatus.NOT_FOUND, withHeaders(HttpMethod.GET, photoPath(leo.getId(), photo.getId()),
                tokenHeaders).getStatusCode());
        assertEquals(HttpStatus.NOT_FOUND, withHeaders(HttpMethod.DELETE, photoPath(leo.getId(), photo.getId()),
                tokenHeaders).getStatusCode());
        assertEquals(1, countPhotosOf(leo));
    }

    // ---------- helpers ----------

    private ResponseEntity<String> withHeaders(HttpMethod method, String path, HttpHeaders authHeaders) {
        return client.method(method)
                .uri(path)
                .headers(headers -> headers.putAll(authHeaders))
                .retrieve()
                .onStatus(status -> true, (req, res) -> {
                })
                .toEntity(String.class);
    }

    private ResponseEntity<String> upload(Athlete athlete, String email, MultiValueMap<String, Object> parts) {
        return upload(athlete.getId(), email, parts);
    }

    private ResponseEntity<String> upload(UUID athleteId, String email, MultiValueMap<String, Object> parts) {
        return client.post()
                .uri(photosPath(athleteId))
                .headers(headers -> AuthHeaders.authenticate(headers, client, email, RAW_PASSWORD))
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(parts)
                .retrieve()
                .onStatus(status -> true, (req, res) -> {
                })
                .toEntity(String.class);
    }

    private ResponseEntity<String> get(String path, String email) {
        return client.get()
                .uri(path)
                .headers(headers -> AuthHeaders.authenticate(headers, client, email, RAW_PASSWORD))
                .retrieve()
                .onStatus(status -> true, (req, res) -> {
                })
                .toEntity(String.class);
    }

    private ResponseEntity<String> delete(String path, String email) {
        return client.method(HttpMethod.DELETE)
                .uri(path)
                .headers(headers -> AuthHeaders.authenticate(headers, client, email, RAW_PASSWORD))
                .retrieve()
                .onStatus(status -> true, (req, res) -> {
                })
                .toEntity(String.class);
    }

    private void assertBadRequestWithField(ResponseEntity<String> response, String field, String message) {
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals(VALIDATION_MESSAGE, body.get("message").asString());
        assertTrue(body.get("fieldErrors").toString().contains("\"field\":\"" + field + "\""), body.toString());
        assertTrue(body.get("fieldErrors").toString().contains(message), body.toString());
    }

    private static MultiValueMap<String, Object> photoParts(byte[] content, String filename, String type,
                                                            String takenOn) {
        MultiValueMap<String, Object> parts = new LinkedMultiValueMap<>();
        if (content != null) {
            parts.add("file", named(content, filename));
        }
        if (type != null) {
            parts.add("type", type);
        }
        if (takenOn != null) {
            parts.add("takenOn", takenOn);
        }
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

    private static SignedUrl signedUrl(String path, String token) {
        return new SignedUrl("https://signed.test/" + path + "?token=" + token,
                Instant.now().plus(Duration.ofMinutes(10)));
    }

    private static String photosPath(UUID athleteId) {
        return "/api/athletes/" + athleteId + "/photos";
    }

    private static String photoPath(UUID athleteId, UUID photoId) {
        return photosPath(athleteId) + "/" + photoId;
    }

    private UUID athleteOf(String email) {
        return athleteRepository.findAll().stream()
                .filter(athlete -> athlete.getEmail().equals(email))
                .findFirst()
                .orElseThrow()
                .getId();
    }

    private ProgressPhoto saveProgressPhoto(Athlete athlete, ProgressPhotoType type, LocalDate takenOn,
                                            String storagePath) {
        return progressPhotoRepository.saveAndFlush(progressPhoto(athlete, type, takenOn, storagePath));
    }

    private int countPhotosOf(Athlete athlete) {
        Integer count = jdbcTemplate.queryForObject("select count(*) from progress_photos where athlete_id = ?",
                Integer.class, athlete.getId());
        return count == null ? 0 : count;
    }

    private Coach saveCoach(String firstName, String email) {
        return coachRepository.saveAndFlush(new Coach(firstName, "Paz", email, passwordEncoder.encode(RAW_PASSWORD)));
    }

    private Athlete saveAthlete(String email, Coach coach) {
        return athleteRepository.saveAndFlush(
                new Athlete("Leo", "Gil", email, passwordEncoder.encode(RAW_PASSWORD), coach));
    }

    private JsonNode json(ResponseEntity<String> response) {
        assertNotNull(response.getBody());
        return jsonMapper.readTree(response.getBody());
    }
}
