package com.gestion_deportiva.api.e2e;

import com.gestion_deportiva.api.TestcontainersConfiguration;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.repository.AthleteRepository;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
import com.gestion_deportiva.api.exercise.dto.ExerciseRequest;
import com.gestion_deportiva.api.exercise.exception.ExerciseAccessDeniedException;
import com.gestion_deportiva.api.exercise.model.Exercise;
import com.gestion_deportiva.api.exercise.model.enums.MuscleGroup;
import com.gestion_deportiva.api.exercise.repository.ExerciseRepository;
import com.gestion_deportiva.api.routine.model.Routine;
import com.gestion_deportiva.api.routine.repository.RoutineRepository;
import com.gestion_deportiva.api.support.AuthHeaders;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static com.gestion_deportiva.api.support.ExerciseFixtures.VIDEO_URL;
import static com.gestion_deportiva.api.support.ExerciseFixtures.exercise;
import static com.gestion_deportiva.api.support.ExerciseFixtures.exerciseRequest;
import static com.gestion_deportiva.api.support.ExerciseFixtures.exerciseRequestWithOnlyRequired;
import static com.gestion_deportiva.api.support.IdentityFixtures.RAW_PASSWORD;
import static com.gestion_deportiva.api.support.RoutineFixtures.routine;
import static com.gestion_deportiva.api.support.RoutineFixtures.routineExercise;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Catálogo de ejercicios (US-38). Cada test arma sus propios globales: los precargados por la V3 no se usan,
// porque según el orden de ejecución pueden estar o no (el TRUNCATE users CASCADE de los e2e vacía exercises)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
class ExerciseE2ETest {

    private static final String PATH = "/api/exercises";
    private static final String COACH_EMAIL = "ana@test.com";
    private static final String OTHER_COACH_EMAIL = "bruno@test.com";
    private static final String ATHLETE_EMAIL = "leo@test.com";

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
    private ExerciseRepository exerciseRepository;

    @Autowired
    private RoutineRepository routineRepository;

    private RestClient client;

    private Coach coach;

    private Coach otherCoach;

    @BeforeEach
    void setUp() {
        client = RestClient.create("http://localhost:" + port);
        // Arranca sin ejercicios: si esta clase corre primero, todavía están los globales precargados.
        // CASCADE: también vacía routine_exercises, que los referencia
        jdbcTemplate.execute("TRUNCATE exercises CASCADE");
        // Hash BCrypt real: la autenticación valida la contraseña contra la base
        coach = coachRepository.saveAndFlush(
                new Coach("Ana", "Paz", COACH_EMAIL, passwordEncoder.encode(RAW_PASSWORD)));
        otherCoach = coachRepository.saveAndFlush(
                new Coach("Bruno", "Sosa", OTHER_COACH_EMAIL, passwordEncoder.encode(RAW_PASSWORD)));
        athleteRepository.saveAndFlush(
                new Athlete("Leo", "Gil", ATHLETE_EMAIL, passwordEncoder.encode(RAW_PASSWORD), coach));
    }

    // Sin @Transactional (la request corre en otro hilo): se limpia a mano. CASCADE vacía también exercises
    @AfterEach
    void cleanUp() {
        jdbcTemplate.execute("TRUNCATE users CASCADE");
        jdbcTemplate.execute("TRUNCATE exercises CASCADE");
    }

    // ---------- alta ----------

    @Test
    void shouldReturn201WithTheExerciseAndPersistItAuthoredByTheCoach() {
        // Arrange
        ExerciseRequest request = exerciseRequest("Press de banca");

        // Act
        ResponseEntity<String> response = exchange(HttpMethod.POST, "", request, COACH_EMAIL);

        // Assert: respuesta
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        JsonNode body = json(response);
        String id = body.get("id").asString();
        assertNotNull(response.getHeaders().getLocation());
        assertTrue(response.getHeaders().getLocation().toString().endsWith(PATH + "/" + id));
        assertEquals("Press de banca", body.get("name").asString());
        assertEquals("CHEST", body.get("muscleGroup").asString());
        assertEquals(request.description(), body.get("description").asString());
        assertEquals(VIDEO_URL, body.get("videoUrl").asString());
        assertFalse(body.get("global").asBoolean());

        // Assert: base de datos
        Map<String, Object> row = jdbcTemplate.queryForMap(
                "select created_by::text as created_by, muscle_group_id, deleted_at from exercises where id = ?::uuid",
                id);
        assertEquals(coach.getId().toString(), row.get("created_by"));
        assertEquals(MuscleGroup.CHEST.getId(), ((Number) row.get("muscle_group_id")).shortValue());
        assertEquals(null, row.get("deleted_at"));
    }

    @Test
    void shouldReturn201WithOnlyRequiredFields() {
        ResponseEntity<String> response = exchange(HttpMethod.POST, "",
                exerciseRequestWithOnlyRequired("Remo"), COACH_EMAIL);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertTrue(json(response).get("videoUrl").isNull());
        assertTrue(json(response).get("description").isNull());
    }

    @Test
    void shouldReturn400WithTheInvalidFields() {
        // Act
        ResponseEntity<String> response = exchange(HttpMethod.POST, "",
                new ExerciseRequest(" ", null, null, "ftp://video.com/a.mp4"), COACH_EMAIL);

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals(Set.of("name", "muscleGroup", "videoUrl"), fieldErrors(response));
        assertEquals(0, count());
    }

    @Test
    void shouldReturn400WhenTheMuscleGroupDoesNotExist() {
        ResponseEntity<String> response = exchange(HttpMethod.POST, "",
                "{\"name\":\"Press\",\"muscleGroup\":\"WINGS\"}", COACH_EMAIL);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals(0, count());
    }

    @Test
    void shouldReturn409WhenTheCoachAlreadyHasThatNameIgnoringCase() {
        // Arrange
        exerciseRepository.saveAndFlush(exercise("Press de banca", MuscleGroup.CHEST, coach));

        // Act
        ResponseEntity<String> response = exchange(HttpMethod.POST, "",
                exerciseRequest(" PRESS DE BANCA "), COACH_EMAIL);

        // Assert
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertTrue(json(response).get("message").asString().contains("PRESS DE BANCA"));
        assertEquals(1, count());
    }

    @Test
    void shouldAllowANameUsedByAGlobalOrAnotherCoach() {
        exerciseRepository.saveAndFlush(exercise("Press de banca", MuscleGroup.CHEST, null));
        exerciseRepository.saveAndFlush(exercise("Press de banca", MuscleGroup.CHEST, otherCoach));

        ResponseEntity<String> response = exchange(HttpMethod.POST, "", exerciseRequest("Press de banca"),
                COACH_EMAIL);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
    }

    // ---------- listado ----------

    @Test
    void shouldListGlobalsAndOwnSortedByNameWithoutOtherCoaches() {
        // Arrange
        exerciseRepository.saveAndFlush(exercise("Sentadilla", MuscleGroup.QUADRICEPS, null));
        exerciseRepository.saveAndFlush(exercise("Curl", MuscleGroup.BICEPS, coach));
        exerciseRepository.saveAndFlush(exercise("Ajeno", MuscleGroup.BICEPS, otherCoach));

        // Act
        ResponseEntity<String> response = exchange(HttpMethod.GET, "", null, COACH_EMAIL);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals(List.of("Curl", "Sentadilla"), names(body));
        assertEquals(2, body.get("totalElements").asInt());
        assertFalse(body.get("content").get(0).get("global").asBoolean());
        assertTrue(body.get("content").get(1).get("global").asBoolean());
    }

    @Test
    void shouldFilterByNameAndMuscleGroupAndPaginate() {
        // Arrange
        exerciseRepository.saveAndFlush(exercise("Press de banca", MuscleGroup.CHEST, coach));
        exerciseRepository.saveAndFlush(exercise("Press inclinado", MuscleGroup.CHEST, coach));
        exerciseRepository.saveAndFlush(exercise("Press militar", MuscleGroup.SHOULDERS, coach));
        exerciseRepository.saveAndFlush(exercise("Aperturas", MuscleGroup.CHEST, null));

        // Act
        JsonNode filtered = json(exchange(HttpMethod.GET, "?name=PRESS&muscleGroup=CHEST", null, COACH_EMAIL));
        JsonNode secondPage = json(exchange(HttpMethod.GET, "?muscleGroup=CHEST&page=1&size=2&sort=name,desc",
                null, COACH_EMAIL));

        // Assert: el sort del cliente se ignora
        assertEquals(List.of("Press de banca", "Press inclinado"), names(filtered));
        assertEquals(List.of("Press inclinado"), names(secondPage));
        assertEquals(3, secondPage.get("totalElements").asInt());
        assertEquals(2, secondPage.get("totalPages").asInt());
    }

    @Test
    void shouldReturn400ForAnUnknownMuscleGroupFilter() {
        ResponseEntity<String> response = exchange(HttpMethod.GET, "?muscleGroup=WINGS", null, COACH_EMAIL);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    void shouldListTheMuscleGroups() {
        // Act
        ResponseEntity<String> response = client.get()
                .uri("/api/muscle-groups")
                .headers(headers -> AuthHeaders.authenticate(headers, client, COACH_EMAIL, RAW_PASSWORD))
                .retrieve()
                .toEntity(String.class);

        // Assert
        JsonNode body = json(response);
        assertEquals(MuscleGroup.values().length, body.size());
        assertEquals("CHEST", body.get(0).get("code").asString());
        assertEquals("Pecho", body.get(0).get("name").asString());
        assertEquals("UPPER", body.get(0).get("region").asString());
    }

    // El atleta los usa para mostrar el grupo de cada ejercicio de su rutina (US-17, D-019)
    @Test
    void shouldListTheMuscleGroupsToAnAthlete() {
        // Act
        ResponseEntity<String> response = client.get()
                .uri("/api/muscle-groups")
                .headers(headers -> AuthHeaders.authenticate(headers, client, ATHLETE_EMAIL, RAW_PASSWORD))
                .retrieve()
                .toEntity(String.class);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals(MuscleGroup.values().length, body.size());
        assertEquals("Pecho", body.get(0).get("name").asString());
    }

    // ---------- consulta ----------

    @Test
    void shouldReturnAGlobalOrOwnExerciseAnd403ForAnotherCoachs() {
        Exercise global = exerciseRepository.saveAndFlush(exercise("Sentadilla", MuscleGroup.QUADRICEPS, null));
        Exercise foreign = exerciseRepository.saveAndFlush(exercise("Ajeno", MuscleGroup.BICEPS, otherCoach));

        assertEquals(HttpStatus.OK, exchange(HttpMethod.GET, global.getId().toString(), null, COACH_EMAIL)
                .getStatusCode());
        ResponseEntity<String> denied = exchange(HttpMethod.GET, foreign.getId().toString(), null, COACH_EMAIL);
        assertEquals(HttpStatus.FORBIDDEN, denied.getStatusCode());
        assertEquals(ExerciseAccessDeniedException.NOT_OWNER_MESSAGE, json(denied).get("message").asString());
    }

    @Test
    void shouldReturn404ForAnUnknownExercise() {
        ResponseEntity<String> response = exchange(HttpMethod.GET, UUID.randomUUID().toString(), null, COACH_EMAIL);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    // ---------- edición ----------

    @Test
    void shouldUpdateAnOwnExercise() {
        // Arrange
        Exercise own = exerciseRepository.saveAndFlush(exercise("Press", MuscleGroup.CHEST, coach));

        // Act
        ResponseEntity<String> response = exchange(HttpMethod.PUT, own.getId().toString(),
                new ExerciseRequest("Press inclinado", MuscleGroup.SHOULDERS, "Banco a 45°", null), COACH_EMAIL);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("Press inclinado", json(response).get("name").asString());
        Map<String, Object> row = jdbcTemplate.queryForMap(
                "select name, muscle_group_id, description, video_url from exercises where id = ?", own.getId());
        assertEquals("Press inclinado", row.get("name"));
        assertEquals(MuscleGroup.SHOULDERS.getId(), ((Number) row.get("muscle_group_id")).shortValue());
        assertEquals("Banco a 45°", row.get("description"));
        assertEquals(null, row.get("video_url"));
    }

    @Test
    void shouldReturn409WhenRenamingToAnotherOwnExercisesName() {
        exerciseRepository.saveAndFlush(exercise("Remo", MuscleGroup.BACK, coach));
        Exercise own = exerciseRepository.saveAndFlush(exercise("Press", MuscleGroup.CHEST, coach));

        ResponseEntity<String> response = exchange(HttpMethod.PUT, own.getId().toString(),
                exerciseRequest("remo"), COACH_EMAIL);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
    }

    @Test
    void shouldReturn403WhenEditingAGlobalOrAnotherCoachsExercise() {
        // Arrange
        Exercise global = exerciseRepository.saveAndFlush(exercise("Sentadilla", MuscleGroup.QUADRICEPS, null));
        Exercise foreign = exerciseRepository.saveAndFlush(exercise("Ajeno", MuscleGroup.BICEPS, otherCoach));

        // Act
        ResponseEntity<String> onGlobal = exchange(HttpMethod.PUT, global.getId().toString(),
                exerciseRequest("Otra"), COACH_EMAIL);
        ResponseEntity<String> onForeign = exchange(HttpMethod.PUT, foreign.getId().toString(),
                exerciseRequest("Otra"), COACH_EMAIL);

        // Assert
        assertEquals(HttpStatus.FORBIDDEN, onGlobal.getStatusCode());
        assertEquals(ExerciseAccessDeniedException.GLOBAL_MESSAGE, json(onGlobal).get("message").asString());
        assertEquals(HttpStatus.FORBIDDEN, onForeign.getStatusCode());
        assertEquals(Set.of("Sentadilla", "Ajeno"),
                new HashSet<>(jdbcTemplate.queryForList("select name from exercises", String.class)));
    }

    @Test
    void shouldReturn400WhenEditingWithInvalidFields() {
        Exercise own = exerciseRepository.saveAndFlush(exercise("Press", MuscleGroup.CHEST, coach));

        ResponseEntity<String> response = exchange(HttpMethod.PUT, own.getId().toString(),
                new ExerciseRequest("Press", MuscleGroup.CHEST, null, "javascript:alert(1)"), COACH_EMAIL);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals(Set.of("videoUrl"), fieldErrors(response));
    }

    // ---------- baja ----------

    @Test
    void shouldSoftDeleteAnOwnExerciseAndFreeItsName() {
        // Arrange
        Exercise own = exerciseRepository.saveAndFlush(exercise("Press", MuscleGroup.CHEST, coach));

        // Act
        ResponseEntity<String> response = exchange(HttpMethod.DELETE, own.getId().toString(), null, COACH_EMAIL);

        // Assert: la fila queda en la base, pero la API no la ve más
        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        assertEquals(1, jdbcTemplate.queryForObject(
                "select count(*) from exercises where id = ? and deleted_at is not null", Integer.class, own.getId()));
        assertEquals(HttpStatus.NOT_FOUND,
                exchange(HttpMethod.GET, own.getId().toString(), null, COACH_EMAIL).getStatusCode());
        assertEquals(List.of(), names(json(exchange(HttpMethod.GET, "", null, COACH_EMAIL))));
        assertEquals(HttpStatus.NOT_FOUND,
                exchange(HttpMethod.DELETE, own.getId().toString(), null, COACH_EMAIL).getStatusCode());
        assertEquals(HttpStatus.CREATED,
                exchange(HttpMethod.POST, "", exerciseRequest("Press"), COACH_EMAIL).getStatusCode());
    }

    @Test
    void shouldReturn422WhenDeletingAnExerciseUsedInARoutine() {
        // Arrange
        Exercise own = exerciseRepository.saveAndFlush(exercise("Press", MuscleGroup.CHEST, coach));
        Routine routine = routine("Fuerza", coach);
        routine.addDay("Empuje").addExercise(routineExercise(own));
        routineRepository.saveAndFlush(routine);

        // Act
        ResponseEntity<String> response = exchange(HttpMethod.DELETE, own.getId().toString(), null, COACH_EMAIL);

        // Assert: sigue en el catálogo
        assertEquals(HttpStatus.UNPROCESSABLE_CONTENT, response.getStatusCode());
        assertEquals(0, jdbcTemplate.queryForObject(
                "select count(*) from exercises where deleted_at is not null", Integer.class));
    }

    @Test
    void shouldReturn403WhenDeletingAGlobalOrAnotherCoachsExercise() {
        Exercise global = exerciseRepository.saveAndFlush(exercise("Sentadilla", MuscleGroup.QUADRICEPS, null));
        Exercise foreign = exerciseRepository.saveAndFlush(exercise("Ajeno", MuscleGroup.BICEPS, otherCoach));

        assertEquals(HttpStatus.FORBIDDEN,
                exchange(HttpMethod.DELETE, global.getId().toString(), null, COACH_EMAIL).getStatusCode());
        assertEquals(HttpStatus.FORBIDDEN,
                exchange(HttpMethod.DELETE, foreign.getId().toString(), null, COACH_EMAIL).getStatusCode());
        assertEquals(0, jdbcTemplate.queryForObject(
                "select count(*) from exercises where deleted_at is not null", Integer.class));
    }

    // ---------- autenticación y rol ----------

    @Test
    void shouldReturn401WithoutTokenAnd403ForAnAthlete() {
        assertEquals(HttpStatus.UNAUTHORIZED, exchange(HttpMethod.GET, "", null, null).getStatusCode());
        assertEquals(HttpStatus.FORBIDDEN, exchange(HttpMethod.GET, "", null, ATHLETE_EMAIL).getStatusCode());
        assertEquals(HttpStatus.FORBIDDEN,
                exchange(HttpMethod.POST, "", exerciseRequest("Press"), ATHLETE_EMAIL).getStatusCode());
        assertEquals(0, count());
    }

    // Request a /api/exercises{suffix} con la sesión de ese email (null = sin token). suffix: "", "?query" o un id
    private ResponseEntity<String> exchange(HttpMethod method, String suffix, Object body, String email) {
        String uri = suffix.isEmpty() || suffix.startsWith("?") ? PATH + suffix : PATH + "/" + suffix;
        RestClient.RequestBodySpec request = client.method(method)
                .uri(uri)
                .headers(headers -> {
                    if (email != null) {
                        AuthHeaders.authenticate(headers, client, email, RAW_PASSWORD);
                    }
                });
        if (body != null) {
            request = request.contentType(MediaType.APPLICATION_JSON)
                    .body(body instanceof String raw ? raw : jsonMapper.writeValueAsString(body));
        }
        return request.retrieve()
                // Los 4xx se validan en cada test, no deben lanzar excepción
                .onStatus(status -> true, (req, res) -> {
                })
                .toEntity(String.class);
    }

    private JsonNode json(ResponseEntity<String> response) {
        return jsonMapper.readTree(response.getBody());
    }

    private Set<String> fieldErrors(ResponseEntity<String> response) {
        Set<String> fields = new HashSet<>();
        json(response).get("fieldErrors").forEach(error -> fields.add(error.get("field").asString()));
        return fields;
    }

    private static List<String> names(JsonNode page) {
        List<String> names = new ArrayList<>();
        page.get("content").forEach(exercise -> names.add(exercise.get("name").asString()));
        return names;
    }

    private int count() {
        Integer count = jdbcTemplate.queryForObject("select count(*) from exercises", Integer.class);
        return count == null ? 0 : count;
    }
}
