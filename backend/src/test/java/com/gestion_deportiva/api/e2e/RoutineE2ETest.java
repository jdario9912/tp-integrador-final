package com.gestion_deportiva.api.e2e;

import com.gestion_deportiva.api.TestcontainersConfiguration;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.repository.AthleteRepository;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
import com.gestion_deportiva.api.exercise.model.Exercise;
import com.gestion_deportiva.api.exercise.model.enums.MuscleGroup;
import com.gestion_deportiva.api.exercise.repository.ExerciseRepository;
import com.gestion_deportiva.api.routine.dto.RoutineExerciseRequest;
import com.gestion_deportiva.api.routine.dto.RoutineRequest;
import com.gestion_deportiva.api.routine.exception.RoutineAccessDeniedException;
import com.gestion_deportiva.api.routine.model.Routine;
import com.gestion_deportiva.api.routine.model.RoutineDay;
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

import static com.gestion_deportiva.api.support.ExerciseFixtures.exercise;
import static com.gestion_deportiva.api.support.IdentityFixtures.RAW_PASSWORD;
import static com.gestion_deportiva.api.support.RoutineFixtures.day;
import static com.gestion_deportiva.api.support.RoutineFixtures.exerciseRequest;
import static com.gestion_deportiva.api.support.RoutineFixtures.exerciseRequestWithOnlyRequired;
import static com.gestion_deportiva.api.support.RoutineFixtures.routine;
import static com.gestion_deportiva.api.support.RoutineFixtures.routineExercise;
import static com.gestion_deportiva.api.support.RoutineFixtures.routineRequest;
import static com.gestion_deportiva.api.support.RoutineFixtures.routineRequestWithOnlyRequired;
import static com.gestion_deportiva.api.support.RoutineFixtures.structure;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Rutinas del entrenador: alta, "mis rutinas" y detalle (US-13), estructura (US-14), edición y duplicado (US-15)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
class RoutineE2ETest {

    private static final String PATH = "/api/routines";
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
    private RoutineRepository routineRepository;

    @Autowired
    private ExerciseRepository exerciseRepository;

    private RestClient client;

    private Coach coach;

    private Coach otherCoach;

    @BeforeEach
    void setUp() {
        client = RestClient.create("http://localhost:" + port);
        // Hash BCrypt real: la autenticación valida la contraseña contra la base
        coach = coachRepository.saveAndFlush(
                new Coach("Ana", "Paz", COACH_EMAIL, passwordEncoder.encode(RAW_PASSWORD)));
        otherCoach = coachRepository.saveAndFlush(
                new Coach("Bruno", "Sosa", OTHER_COACH_EMAIL, passwordEncoder.encode(RAW_PASSWORD)));
        athleteRepository.saveAndFlush(
                new Athlete("Leo", "Gil", ATHLETE_EMAIL, passwordEncoder.encode(RAW_PASSWORD), coach));
    }

    // Sin @Transactional (la request corre en otro hilo): se limpia a mano. CASCADE vacía también routines
    @AfterEach
    void cleanUp() {
        jdbcTemplate.execute("TRUNCATE users CASCADE");
    }

    // ---------- alta ----------

    @Test
    void shouldReturn201WithTheRoutineAndPersistItOwnedByTheCoach() {
        // Arrange
        RoutineRequest request = routineRequest("Fuerza 4 días");

        // Act
        ResponseEntity<String> response = exchange(HttpMethod.POST, "", request, COACH_EMAIL);

        // Assert: respuesta
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        JsonNode body = json(response);
        String id = body.get("id").asString();
        assertNotNull(response.getHeaders().getLocation());
        assertTrue(response.getHeaders().getLocation().toString().endsWith(PATH + "/" + id));
        assertEquals("Fuerza 4 días", body.get("name").asString());
        assertEquals(request.description(), body.get("description").asString());
        assertEquals(request.goal(), body.get("goal").asString());
        assertEquals(4, body.get("daysPerWeek").asInt());
        assertEquals(8, body.get("durationWeeks").asInt());
        assertTrue(body.get("isTemplate").asBoolean());
        assertFalse(body.get("createdAt").isNull());

        // Assert: base de datos
        Map<String, Object> row = jdbcTemplate.queryForMap(
                "select coach_id::text as coach_id, is_template from routines where id = ?::uuid", id);
        assertEquals(coach.getId().toString(), row.get("coach_id"));
        assertEquals(true, row.get("is_template"));
    }

    @Test
    void shouldReturn201WithOnlyRequiredFieldsAndNotATemplate() {
        ResponseEntity<String> response = exchange(HttpMethod.POST, "",
                routineRequestWithOnlyRequired("Fuerza"), COACH_EMAIL);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        JsonNode body = json(response);
        assertFalse(body.get("isTemplate").asBoolean());
        assertTrue(body.get("description").isNull());
        assertTrue(body.get("goal").isNull());
        assertTrue(body.get("daysPerWeek").isNull());
        assertTrue(body.get("durationWeeks").isNull());
    }

    @Test
    void shouldReturn400WithTheInvalidFields() {
        // Act
        ResponseEntity<String> response = exchange(HttpMethod.POST, "",
                new RoutineRequest(" ", "d".repeat(501), null, (short) 8, (short) 0, null), COACH_EMAIL);

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals(Set.of("name", "description", "daysPerWeek", "durationWeeks"), fieldErrors(response));
        assertEquals(0, count());
    }

    @Test
    void shouldReturn400WhenTheNameIsTooLong() {
        ResponseEntity<String> response = exchange(HttpMethod.POST, "",
                routineRequestWithOnlyRequired("a".repeat(101)), COACH_EMAIL);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals(Set.of("name"), fieldErrors(response));
        assertEquals(0, count());
    }

    @Test
    void shouldReturn409WhenTheCoachAlreadyHasThatNameIgnoringCase() {
        // Arrange
        routineRepository.saveAndFlush(routine("Fuerza 4 días", coach));

        // Act
        ResponseEntity<String> response = exchange(HttpMethod.POST, "",
                routineRequest(" FUERZA 4 DÍAS "), COACH_EMAIL);

        // Assert
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertTrue(json(response).get("message").asString().contains("FUERZA 4 DÍAS"));
        assertEquals(1, count());
    }

    @Test
    void shouldAllowANameUsedByAnotherCoach() {
        routineRepository.saveAndFlush(routine("Fuerza", otherCoach));

        ResponseEntity<String> response = exchange(HttpMethod.POST, "", routineRequest("Fuerza"), COACH_EMAIL);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals(2, count());
    }

    @Test
    void shouldReturn403WhenAnAthleteCreatesARoutine() {
        ResponseEntity<String> response = exchange(HttpMethod.POST, "", routineRequest("Fuerza"), ATHLETE_EMAIL);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals(0, count());
    }

    @Test
    void shouldReturn401WithoutToken() {
        ResponseEntity<String> response = exchange(HttpMethod.POST, "", routineRequest("Fuerza"), null);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertEquals(0, count());
    }

    // ---------- listado ----------

    @Test
    void shouldListOnlyTheCoachsRoutinesSortedByName() {
        // Arrange
        routineRepository.saveAndFlush(routine("Hipertrofia", coach));
        routineRepository.saveAndFlush(routine("Fuerza", coach));
        routineRepository.saveAndFlush(routine("Ajena", otherCoach));

        // Act
        ResponseEntity<String> response = exchange(HttpMethod.GET, "", null, COACH_EMAIL);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        JsonNode page = json(response);
        assertEquals(List.of("Fuerza", "Hipertrofia"), names(page));
        assertEquals(2, page.get("totalElements").asInt());
    }

    @Test
    void shouldPaginateIgnoringTheClientSort() {
        // Arrange
        routineRepository.saveAndFlush(routine("C", coach));
        routineRepository.saveAndFlush(routine("A", coach));
        routineRepository.saveAndFlush(routine("B", coach));

        // Act
        ResponseEntity<String> response = exchange(HttpMethod.GET, "?page=1&size=2&sort=name,desc", null,
                COACH_EMAIL);

        // Assert
        JsonNode page = json(response);
        assertEquals(List.of("C"), names(page));
        assertEquals(3, page.get("totalElements").asInt());
        assertEquals(2, page.get("totalPages").asInt());
    }

    @Test
    void shouldReturnAnEmptyPageWhenTheCoachHasNoRoutines() {
        routineRepository.saveAndFlush(routine("Ajena", otherCoach));

        JsonNode page = json(exchange(HttpMethod.GET, "", null, COACH_EMAIL));

        assertTrue(names(page).isEmpty());
        assertEquals(0, page.get("totalElements").asInt());
    }

    // ---------- detalle ----------

    @Test
    void shouldReturnAnOwnRoutine() {
        Routine own = routineRepository.saveAndFlush(routine("Fuerza", coach));

        ResponseEntity<String> response = exchange(HttpMethod.GET, own.getId().toString(), null, COACH_EMAIL);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("Fuerza", json(response).get("name").asString());
    }

    @Test
    void shouldReturn403ForAnotherCoachsRoutine() {
        Routine foreign = routineRepository.saveAndFlush(routine("Fuerza", otherCoach));

        ResponseEntity<String> response = exchange(HttpMethod.GET, foreign.getId().toString(), null, COACH_EMAIL);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals(RoutineAccessDeniedException.NOT_OWNER_MESSAGE, json(response).get("message").asString());
    }

    @Test
    void shouldReturn404ForAnUnknownRoutine() {
        ResponseEntity<String> response = exchange(HttpMethod.GET, UUID.randomUUID().toString(), null,
                COACH_EMAIL);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    @Test
    void shouldReturnTheDaysAndExercisesInTheDetail() {
        // Arrange
        Exercise bench = exerciseRepository.saveAndFlush(exercise("Press banca", MuscleGroup.CHEST, null));
        Routine own = routine("Fuerza", coach);
        own.addDay("Empuje").addExercise(routineExercise(bench));
        routineRepository.saveAndFlush(own);

        // Act
        JsonNode body = json(exchange(HttpMethod.GET, own.getId().toString(), null, COACH_EMAIL));

        // Assert
        JsonNode day = body.get("days").get(0);
        assertEquals("Empuje", day.get("name").asString());
        assertEquals(1, day.get("dayNumber").asInt());
        JsonNode planned = day.get("exercises").get(0);
        assertEquals(bench.getId().toString(), planned.get("exerciseId").asString());
        assertEquals("Press banca", planned.get("exerciseName").asString());
        assertEquals("CHEST", planned.get("muscleGroup").asString());
        assertEquals(0, planned.get("sortOrder").asInt());
        assertEquals(4, planned.get("sets").asInt());
        assertEquals(10, planned.get("reps").asInt());
        assertEquals(60.5, planned.get("recommendedWeight").asDouble());
        assertEquals(90, planned.get("rest").asInt());
        assertEquals("RIR 2", planned.get("rirRpe").asString());
        assertEquals("Bajar en 3 segundos", planned.get("techniqueNote").asString());
    }

    // ---------- estructura (US-14) ----------

    @Test
    void shouldConfigureTheDaysAndExercisesOfTheRoutine() {
        // Arrange: un ejercicio global y uno propio
        Routine own = routineRepository.saveAndFlush(routine("Fuerza", coach));
        Exercise bench = exerciseRepository.saveAndFlush(exercise("Press banca", MuscleGroup.CHEST, null));
        Exercise row = exerciseRepository.saveAndFlush(exercise("Remo propio", MuscleGroup.BACK, coach));

        // Act
        ResponseEntity<String> response = exchange(HttpMethod.PUT, own.getId() + "/days", structure(
                day(null, "Empuje", exerciseRequest(null, bench.getId())),
                day(null, "Tirón", exerciseRequestWithOnlyRequired(null, row.getId()),
                        new RoutineExerciseRequest(null, bench.getId(), 3, 8, null, 60, "rpe 8.5", null))),
                COACH_EMAIL);

        // Assert: respuesta
        assertEquals(HttpStatus.OK, response.getStatusCode());
        JsonNode days = json(response).get("days");
        assertEquals(2, days.size());
        assertEquals("Tirón", days.get(1).get("name").asString());
        assertEquals(2, days.get(1).get("dayNumber").asInt());
        assertEquals("Remo propio", days.get(1).get("exercises").get(0).get("exerciseName").asString());
        assertEquals(1, days.get(1).get("exercises").get(1).get("sortOrder").asInt());
        assertEquals("RPE 8.5", days.get(1).get("exercises").get(1).get("rirRpe").asString());
        assertFalse(days.get(0).get("exercises").get(0).get("id").isNull());

        // Assert: base de datos
        assertEquals(2, count("routine_days"));
        assertEquals(3, count("routine_exercises"));
    }

    @Test
    void shouldReorderRemoveAndAddKeepingTheIdsOfTheExistingItems() {
        // Arrange: Empuje [press, fondos], Tirón []
        Exercise bench = exerciseRepository.saveAndFlush(exercise("Press banca", MuscleGroup.CHEST, null));
        Routine own = routineRepository.saveAndFlush(routine("Fuerza", coach));
        JsonNode created = json(exchange(HttpMethod.PUT, own.getId() + "/days", structure(
                day(null, "Empuje", exerciseRequest(null, bench.getId()), exerciseRequest(null, bench.getId())),
                day(null, "Tirón")), COACH_EMAIL)).get("days");
        UUID pushId = UUID.fromString(created.get(0).get("id").asString());
        UUID pullId = UUID.fromString(created.get(1).get("id").asString());
        UUID pressId = UUID.fromString(created.get(0).get("exercises").get(0).get("id").asString());

        // Act: Tirón primero, fondos sale, press pasa al final detrás de uno nuevo
        ResponseEntity<String> response = exchange(HttpMethod.PUT, own.getId() + "/days", structure(
                day(pullId, "Tirón"),
                day(pushId, "Empuje", exerciseRequestWithOnlyRequired(null, bench.getId()),
                        exerciseRequest(pressId, bench.getId()))), COACH_EMAIL);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        JsonNode days = json(response).get("days");
        assertEquals(pullId.toString(), days.get(0).get("id").asString());
        assertEquals(1, days.get(0).get("dayNumber").asInt());
        assertEquals(pushId.toString(), days.get(1).get("id").asString());
        assertEquals(pressId.toString(), days.get(1).get("exercises").get(1).get("id").asString());
        assertEquals(1, days.get(1).get("exercises").get(1).get("sortOrder").asInt());
        assertNotEquals(pressId.toString(), days.get(1).get("exercises").get(0).get("id").asString());
        assertEquals(2, count("routine_exercises"));
    }

    @Test
    void shouldRemoveAllTheDaysWithAnEmptyList() {
        Exercise bench = exerciseRepository.saveAndFlush(exercise("Press banca", MuscleGroup.CHEST, null));
        Routine own = routine("Fuerza", coach);
        own.addDay("Empuje").addExercise(routineExercise(bench));
        routineRepository.saveAndFlush(own);

        ResponseEntity<String> response = exchange(HttpMethod.PUT, own.getId() + "/days", structure(), COACH_EMAIL);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(0, json(response).get("days").size());
        assertEquals(0, count("routine_days"));
        assertEquals(0, count("routine_exercises"));
    }

    @Test
    void shouldReturn400WhenSetsOrRepsAreNotPositiveOrRirRpeIsOutOfRange() {
        Routine own = routineRepository.saveAndFlush(routine("Fuerza", coach));
        Exercise bench = exerciseRepository.saveAndFlush(exercise("Press banca", MuscleGroup.CHEST, null));

        ResponseEntity<String> response = exchange(HttpMethod.PUT, own.getId() + "/days", structure(
                day(null, "Empuje", new RoutineExerciseRequest(null, bench.getId(), 0, -1, null, null, "RPE 11", null))),
                COACH_EMAIL);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals(Set.of("days[0].exercises[0].sets", "days[0].exercises[0].reps",
                "days[0].exercises[0].rirRpe"), fieldErrors(response));
        assertEquals(0, count("routine_days"));
    }

    @Test
    void shouldReturn400WhenRirIsOutOfRangeOrTheDayHasNoName() {
        Routine own = routineRepository.saveAndFlush(routine("Fuerza", coach));
        Exercise bench = exerciseRepository.saveAndFlush(exercise("Press banca", MuscleGroup.CHEST, null));

        ResponseEntity<String> response = exchange(HttpMethod.PUT, own.getId() + "/days", structure(
                day(null, " ", new RoutineExerciseRequest(null, bench.getId(), 3, 10, null, null, "RIR 11", null))),
                COACH_EMAIL);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals(Set.of("days[0].name", "days[0].exercises[0].rirRpe"), fieldErrors(response));
    }

    @Test
    void shouldReturn400WhenSetsAreNotNumeric() {
        Routine own = routineRepository.saveAndFlush(routine("Fuerza", coach));
        String body = "{\"days\": [{\"name\": \"Empuje\", \"exercises\": [{\"exerciseId\": \""
                + UUID.randomUUID() + "\", \"sets\": \"cuatro\", \"reps\": 10}]}]}";

        ResponseEntity<String> response = exchange(HttpMethod.PUT, own.getId() + "/days", body, COACH_EMAIL);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    void shouldReturn400WhenADayIdIsNotOfTheRoutine() {
        Routine own = routineRepository.saveAndFlush(routine("Fuerza", coach));
        Routine other = routine("Otra", coach);
        RoutineDay foreignDay = other.addDay("Empuje");
        routineRepository.saveAndFlush(other);

        ResponseEntity<String> response = exchange(HttpMethod.PUT, own.getId() + "/days",
                structure(day(foreignDay.getId(), "Empuje")), COACH_EMAIL);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals(Set.of("days[0].id"), fieldErrors(response));
    }

    @Test
    void shouldReturn404WhenTheExerciseIsNotInTheCoachsCatalog() {
        // Arrange: uno inexistente y uno privado de otro entrenador
        Routine own = routineRepository.saveAndFlush(routine("Fuerza", coach));
        Exercise foreign = exerciseRepository.saveAndFlush(exercise("Ajeno", MuscleGroup.CHEST, otherCoach));

        // Act + Assert
        assertEquals(HttpStatus.NOT_FOUND, exchange(HttpMethod.PUT, own.getId() + "/days",
                structure(day(null, "Empuje", exerciseRequest(null, UUID.randomUUID()))), COACH_EMAIL)
                .getStatusCode());
        assertEquals(HttpStatus.NOT_FOUND, exchange(HttpMethod.PUT, own.getId() + "/days",
                structure(day(null, "Empuje", exerciseRequest(null, foreign.getId()))), COACH_EMAIL)
                .getStatusCode());
        assertEquals(0, count("routine_days"));
    }

    @Test
    void shouldReturn403WhenConfiguringAnotherCoachsRoutine() {
        Routine foreign = routineRepository.saveAndFlush(routine("Fuerza", otherCoach));

        ResponseEntity<String> response = exchange(HttpMethod.PUT, foreign.getId() + "/days",
                structure(day(null, "Empuje")), COACH_EMAIL);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals(0, count("routine_days"));
    }

    @Test
    void shouldReturn404WhenConfiguringAnUnknownRoutine() {
        assertEquals(HttpStatus.NOT_FOUND, exchange(HttpMethod.PUT, UUID.randomUUID() + "/days",
                structure(day(null, "Empuje")), COACH_EMAIL).getStatusCode());
    }

    // ---------- edición (US-15) ----------

    @Test
    void shouldUpdateTheRoutineData() {
        Routine own = routineRepository.saveAndFlush(routine("Fuerza", coach));

        ResponseEntity<String> response = exchange(HttpMethod.PUT, own.getId().toString(),
                routineRequest("Hipertrofia"), COACH_EMAIL);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("Hipertrofia", json(response).get("name").asString());
        assertTrue(json(response).get("isTemplate").asBoolean());
        assertEquals("Hipertrofia", jdbcTemplate.queryForObject(
                "select name from routines where id = ?", String.class, own.getId()));
    }

    @Test
    void shouldAllowKeepingTheSameNameWithOtherCase() {
        Routine own = routineRepository.saveAndFlush(routine("Fuerza", coach));

        ResponseEntity<String> response = exchange(HttpMethod.PUT, own.getId().toString(),
                routineRequestWithOnlyRequired("FUERZA"), COACH_EMAIL);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("FUERZA", json(response).get("name").asString());
    }

    @Test
    void shouldReturn409WhenRenamingToAnotherOfMyRoutinesName() {
        Routine own = routineRepository.saveAndFlush(routine("Fuerza", coach));
        routineRepository.saveAndFlush(routine("Hipertrofia", coach));

        ResponseEntity<String> response = exchange(HttpMethod.PUT, own.getId().toString(),
                routineRequestWithOnlyRequired("hipertrofia"), COACH_EMAIL);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
    }

    @Test
    void shouldReturn400WhenUpdatingWithInvalidData() {
        Routine own = routineRepository.saveAndFlush(routine("Fuerza", coach));

        ResponseEntity<String> response = exchange(HttpMethod.PUT, own.getId().toString(),
                new RoutineRequest("", null, null, (short) 8, null, null), COACH_EMAIL);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals(Set.of("name", "daysPerWeek"), fieldErrors(response));
    }

    @Test
    void shouldReturn403Or404WhenUpdatingARoutineThatIsNotMine() {
        Routine foreign = routineRepository.saveAndFlush(routine("Fuerza", otherCoach));

        assertEquals(HttpStatus.FORBIDDEN, exchange(HttpMethod.PUT, foreign.getId().toString(),
                routineRequest("Hipertrofia"), COACH_EMAIL).getStatusCode());
        assertEquals(HttpStatus.NOT_FOUND, exchange(HttpMethod.PUT, UUID.randomUUID().toString(),
                routineRequest("Hipertrofia"), COACH_EMAIL).getStatusCode());
    }

    // ---------- duplicado (US-15) ----------

    @Test
    void shouldDuplicateTheRoutineWithItsDaysAndExercises() {
        // Arrange
        Exercise bench = exerciseRepository.saveAndFlush(exercise("Press banca", MuscleGroup.CHEST, null));
        Routine own = routine("Fuerza", coach);
        own.addDay("Empuje").addExercise(routineExercise(bench));
        routineRepository.saveAndFlush(own);

        // Act
        ResponseEntity<String> response = exchange(HttpMethod.POST, own.getId() + "/duplicate", null, COACH_EMAIL);

        // Assert: respuesta
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        JsonNode body = json(response);
        String copyId = body.get("id").asString();
        assertNotEquals(own.getId().toString(), copyId);
        assertTrue(response.getHeaders().getLocation().toString().endsWith(PATH + "/" + copyId));
        assertEquals("Copia de Fuerza", body.get("name").asString());
        JsonNode day = body.get("days").get(0);
        assertEquals("Empuje", day.get("name").asString());
        assertEquals("Press banca", day.get("exercises").get(0).get("exerciseName").asString());

        // Assert: filas nuevas, el original queda igual
        assertEquals(2, count("routine_days"));
        assertEquals(2, count("routine_exercises"));
        assertEquals(1, jdbcTemplate.queryForObject(
                "select count(*) from routine_days where routine_id = ?", Integer.class, own.getId()));
    }

    @Test
    void editingTheCopyDoesNotChangeTheOriginal() {
        // Arrange
        Exercise bench = exerciseRepository.saveAndFlush(exercise("Press banca", MuscleGroup.CHEST, null));
        Routine own = routine("Fuerza", coach);
        own.addDay("Empuje").addExercise(routineExercise(bench));
        routineRepository.saveAndFlush(own);
        String copyId = json(exchange(HttpMethod.POST, own.getId() + "/duplicate", null, COACH_EMAIL))
                .get("id").asString();

        // Act
        exchange(HttpMethod.PUT, copyId + "/days", structure(), COACH_EMAIL);

        // Assert
        JsonNode original = json(exchange(HttpMethod.GET, own.getId().toString(), null, COACH_EMAIL));
        assertEquals(1, original.get("days").size());
        assertEquals(1, original.get("days").get(0).get("exercises").size());
    }

    @Test
    void shouldNumberTheCopiesWhenTheNameIsTaken() {
        Routine own = routineRepository.saveAndFlush(routine("Fuerza", coach));

        exchange(HttpMethod.POST, own.getId() + "/duplicate", null, COACH_EMAIL);
        ResponseEntity<String> second = exchange(HttpMethod.POST, own.getId() + "/duplicate", null, COACH_EMAIL);

        assertEquals(HttpStatus.CREATED, second.getStatusCode());
        assertEquals("Copia de Fuerza (2)", json(second).get("name").asString());
    }

    @Test
    void shouldReturn403Or404WhenDuplicatingARoutineThatIsNotMine() {
        Routine foreign = routineRepository.saveAndFlush(routine("Fuerza", otherCoach));

        assertEquals(HttpStatus.FORBIDDEN,
                exchange(HttpMethod.POST, foreign.getId() + "/duplicate", null, COACH_EMAIL).getStatusCode());
        assertEquals(HttpStatus.NOT_FOUND,
                exchange(HttpMethod.POST, UUID.randomUUID() + "/duplicate", null, COACH_EMAIL).getStatusCode());
        assertEquals(1, count());
    }

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
        page.get("content").forEach(routine -> names.add(routine.get("name").asString()));
        return names;
    }

    private int count() {
        return count("routines");
    }

    private int count(String table) {
        Integer count = jdbcTemplate.queryForObject("select count(*) from " + table, Integer.class);
        return count == null ? 0 : count;
    }
}
