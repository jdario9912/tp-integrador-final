package com.gestion_deportiva.api.e2e;

import com.gestion_deportiva.api.TestcontainersConfiguration;
import com.gestion_deportiva.api.assignment.model.RoutineAssignment;
import com.gestion_deportiva.api.assignment.repository.RoutineAssignmentRepository;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.repository.AthleteRepository;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
import com.gestion_deportiva.api.exercise.model.Exercise;
import com.gestion_deportiva.api.exercise.model.enums.MuscleGroup;
import com.gestion_deportiva.api.exercise.repository.ExerciseRepository;
import com.gestion_deportiva.api.routine.model.Routine;
import com.gestion_deportiva.api.routine.model.RoutineDay;
import com.gestion_deportiva.api.routine.model.RoutineExercise;
import com.gestion_deportiva.api.routine.repository.RoutineRepository;
import com.gestion_deportiva.api.support.AuthHeaders;
import com.gestion_deportiva.api.training.model.PerformedSet;
import com.gestion_deportiva.api.training.model.TrainingSession;
import com.gestion_deportiva.api.training.repository.PerformedSetRepository;
import com.gestion_deportiva.api.training.repository.TrainingSessionRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import static com.gestion_deportiva.api.support.AssignmentFixtures.assignment;
import static com.gestion_deportiva.api.support.ExerciseFixtures.exercise;
import static com.gestion_deportiva.api.support.IdentityFixtures.RAW_PASSWORD;
import static com.gestion_deportiva.api.support.RoutineFixtures.routine;
import static com.gestion_deportiva.api.support.RoutineFixtures.routineExercise;
import static com.gestion_deportiva.api.support.TrainingSessionFixtures.middayInArgentina;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Historial de sesiones cerradas (US-21, contrato 15.2 y 15.6): solo las cerradas, con su cumplimiento y su revisión;
// el filtro por fechas, la paginación, la pertenencia de los dos roles y los errores. Las sesiones se crean en la base
// (el cierre por HTTP lo prueba TrainingSessionEndE2ETest) y las consultas van por HTTP
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
class TrainingSessionHistoryE2ETest {

    private static final String COACH_EMAIL = "ana@test.com";
    private static final String OTHER_COACH_EMAIL = "bruno@test.com";
    private static final String ATHLETE_EMAIL = "leo@test.com";
    private static final String OTHER_ATHLETE_EMAIL = "mia@test.com";

    private static final LocalDate NOV_3 = LocalDate.of(2026, 11, 3);
    private static final LocalDate NOV_11 = LocalDate.of(2026, 11, 11);

    private static final String UNAUTHORIZED_MESSAGE = "Debe iniciar sesión para acceder a este recurso";
    private static final String ATHLETE_FORBIDDEN_MESSAGE = "No tiene permisos para acceder a este atleta";

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

    @Autowired
    private RoutineAssignmentRepository routineAssignmentRepository;

    @Autowired
    private TrainingSessionRepository trainingSessionRepository;

    @Autowired
    private PerformedSetRepository performedSetRepository;

    private RestClient client;

    private Coach coach;

    private Athlete leo;

    private Athlete mia;

    private RoutineAssignment leoAssignment;

    private RoutineAssignment miaAssignment;

    // Torso: press (4 series) y remo (3), total 7. Pierna: sentadilla (4)
    private RoutineDay upper;

    private RoutineDay lower;

    @BeforeEach
    void setUp() {
        client = RestClient.create("http://localhost:" + port);
        coach = coachRepository.saveAndFlush(new Coach("Ana", "Paz", COACH_EMAIL, passwordEncoder.encode(RAW_PASSWORD)));
        coachRepository.saveAndFlush(new Coach("Bruno", "Gil", OTHER_COACH_EMAIL, passwordEncoder.encode(RAW_PASSWORD)));
        leo = athleteRepository.saveAndFlush(
                new Athlete("Leo", "Gil", ATHLETE_EMAIL, passwordEncoder.encode(RAW_PASSWORD), coach));
        mia = athleteRepository.saveAndFlush(
                new Athlete("Mia", "Ruiz", OTHER_ATHLETE_EMAIL, passwordEncoder.encode(RAW_PASSWORD), coach));
        // Ejercicios propios de Ana: no chocan con los globales precargados por la V3
        Exercise bench = exerciseRepository.saveAndFlush(exercise("Press banca", MuscleGroup.CHEST, coach));
        Exercise row = exerciseRepository.saveAndFlush(exercise("Remo bajo", MuscleGroup.BACK, coach));
        Exercise squat = exerciseRepository.saveAndFlush(exercise("Sentadilla", MuscleGroup.QUADRICEPS, coach));

        Routine strength = routine("Fuerza", coach);
        upper = strength.addDay("Torso");
        upper.addExercise(routineExercise(bench));
        upper.addExercise(RoutineExercise.builder().exercise(row).sets((short) 3).reps((short) 12).build());
        lower = strength.addDay("Pierna");
        lower.addExercise(routineExercise(squat));
        strength = routineRepository.saveAndFlush(strength);

        leoAssignment = routineAssignmentRepository.saveAndFlush(assignment(leo, strength, NOV_3));
        miaAssignment = routineAssignmentRepository.saveAndFlush(assignment(mia, strength, NOV_3));
    }

    // Sin @Transactional (la request corre en otro hilo): se limpia a mano
    @AfterEach
    void cleanUp() {
        jdbcTemplate.execute("TRUNCATE users CASCADE");
    }

    // ---------- contenido del historial ----------

    @Test
    void shouldListTheClosedSessionsWithTheirSummaryAndHideTheOneInProgress() {
        // Arrange: torso del 3/11 finalizado (2 realizadas, 1 omitida, volumen 600 + 500 = 1100); pierna del 11/11
        // cancelada; torso del 11/11 en progreso (no entra)
        TrainingSession torso = session(leoAssignment, upper, NOV_3);
        torso.finish(torso.getStartedAt().plusSeconds(2700));
        trainingSessionRepository.saveAndFlush(torso);
        performedSetRepository.saveAndFlush(done(torso, upper, 0, "60", 10));
        performedSetRepository.saveAndFlush(done(torso, upper, 1, "62.5", 8));
        performedSetRepository.saveAndFlush(skipped(torso, upper, 2));
        TrainingSession legs = session(leoAssignment, lower, NOV_11);
        legs.cancel(legs.getStartedAt().plusSeconds(900));
        trainingSessionRepository.saveAndFlush(legs);
        trainingSessionRepository.saveAndFlush(session(leoAssignment, upper, NOV_11));

        // Act
        ResponseEntity<String> response = get(historyPath(leo), COACH_EMAIL);

        // Assert: 200 con las dos cerradas, la más reciente primero
        assertEquals(HttpStatus.OK, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals(2, body.get("totalElements").asInt());
        assertEquals(20, body.get("size").asInt());
        JsonNode cancelled = body.get("content").get(0);
        JsonNode finished = body.get("content").get(1);

        assertEquals(legs.getId().toString(), cancelled.get("id").asString());
        assertEquals("2026-11-11", cancelled.get("sessionDate").asString());
        assertEquals("CANCELLED", cancelled.get("status").asString());
        assertEquals("Fuerza", cancelled.get("routineName").asString());
        assertEquals(2, cancelled.get("dayNumber").asInt());
        assertEquals("Pierna", cancelled.get("dayName").asString());
        assertFalse(cancelled.get("endedAt").isNull());
        assertTrue(cancelled.get("review").isNull());
        assertEquals(4, cancelled.get("summary").get("prescribedSets").asInt());
        assertEquals(0, cancelled.get("summary").get("doneSets").asInt());

        assertEquals(torso.getId().toString(), finished.get("id").asString());
        assertEquals("FINISHED", finished.get("status").asString());
        assertEquals("Torso", finished.get("dayName").asString());
        assertEquals(1, finished.get("dayNumber").asInt());
        JsonNode summary = finished.get("summary");
        assertEquals(7, summary.get("prescribedSets").asInt());
        assertEquals(2, summary.get("doneSets").asInt());
        assertEquals(1, summary.get("skippedSets").asInt());
        assertEquals(4, summary.get("pendingSets").asInt());
        assertEquals(1100.0, summary.get("volumeKg").asDouble());
    }

    @Test
    void shouldShowTheCoachObservationToTheAthleteInTheHistoryAndInTheDetail() {
        // Arrange: el entrenador ya revisó el torso
        TrainingSession torso = session(leoAssignment, upper, NOV_3);
        torso.finish(torso.getStartedAt().plusSeconds(2700));
        trainingSessionRepository.saveAndFlush(torso);
        torso.review(Instant.parse("2026-11-12T12:00:00.123456789Z"), "Bien la técnica");
        trainingSessionRepository.saveAndFlush(torso);

        // Act
        JsonNode history = json(get(historyPath(leo), ATHLETE_EMAIL));
        JsonNode detail = json(get(historyPath(leo) + "/" + torso.getId(), ATHLETE_EMAIL));

        // Assert: el atleta ve la observación y la hora de revisión en el historial y en el detalle
        JsonNode review = history.get("content").get(0).get("review");
        assertEquals("Bien la técnica", review.get("observation").asString());
        assertEquals(Instant.parse("2026-11-12T12:00:00.123456Z"), Instant.parse(review.get("reviewedAt").asString()));
        assertEquals("Bien la técnica", detail.get("review").get("observation").asString());
    }

    // ---------- rango de fechas y paginación ----------

    @Test
    void shouldFilterByTheInclusiveDateRange() {
        // Arrange: uno el 3/11 y otro el 11/11
        closed(leoAssignment, upper, NOV_3);
        closed(leoAssignment, lower, NOV_11);

        // Act + Assert
        assertEquals(1, json(get(historyPath(leo) + "?from=2026-11-04", COACH_EMAIL)).get("totalElements").asInt());
        assertEquals(1, json(get(historyPath(leo) + "?to=2026-11-03", COACH_EMAIL)).get("totalElements").asInt());
        assertEquals(2, json(get(historyPath(leo) + "?from=2026-11-03&to=2026-11-11", COACH_EMAIL))
                .get("totalElements").asInt());
        assertEquals(0, json(get(historyPath(leo) + "?from=2026-11-05&to=2026-11-10", COACH_EMAIL))
                .get("totalElements").asInt());
    }

    @Test
    void shouldReturn400WhenTheRangeIsInvertedOrTheDateIsMalformed() {
        // Act
        ResponseEntity<String> inverted = get(historyPath(leo) + "?from=2026-11-11&to=2026-11-03", COACH_EMAIL);
        ResponseEntity<String> malformed = get(historyPath(leo) + "?from=2026/11/03", COACH_EMAIL);

        // Assert: from posterior a to, con el error en from
        assertEquals(HttpStatus.BAD_REQUEST, inverted.getStatusCode());
        JsonNode fieldErrors = json(inverted).get("fieldErrors");
        assertEquals("from", fieldErrors.get(0).get("field").asString());
        assertEquals("La fecha desde no puede ser posterior a la fecha hasta",
                fieldErrors.get(0).get("message").asString());

        assertEquals(HttpStatus.BAD_REQUEST, malformed.getStatusCode());
    }

    @Test
    void shouldPageTheHistoryWithTheRequestedSize() {
        closed(leoAssignment, upper, NOV_3);
        closed(leoAssignment, lower, NOV_11);

        // Act
        JsonNode firstPage = json(get(historyPath(leo) + "?page=0&size=1", COACH_EMAIL));
        JsonNode secondPage = json(get(historyPath(leo) + "?page=1&size=1", COACH_EMAIL));

        // Assert
        assertEquals(1, firstPage.get("content").size());
        assertEquals(2, firstPage.get("totalElements").asInt());
        assertEquals(2, firstPage.get("totalPages").asInt());
        assertEquals("2026-11-11", firstPage.get("content").get(0).get("sessionDate").asString());
        assertEquals("2026-11-03", secondPage.get("content").get(0).get("sessionDate").asString());
    }

    // ---------- pertenencia y errores ----------

    @Test
    void shouldAllowTheAthleteToReadHisOwnHistoryAndTheCoachTheHistoryOfHisAthletes() {
        closed(leoAssignment, upper, NOV_3);

        assertEquals(HttpStatus.OK, get(historyPath(leo), ATHLETE_EMAIL).getStatusCode());
        assertEquals(HttpStatus.OK, get(historyPath(leo), COACH_EMAIL).getStatusCode());
        assertEquals(HttpStatus.OK, get(historyPath(mia), COACH_EMAIL).getStatusCode());
    }

    @Test
    void shouldReturn403ForAnAthleteOfAnotherCoachOrAnotherAthlete() {
        closed(leoAssignment, upper, NOV_3);

        // Un entrenador ajeno, y un atleta que no es el dueño del historial
        ResponseEntity<String> otherCoach = get(historyPath(leo), OTHER_COACH_EMAIL);
        ResponseEntity<String> otherAthlete = get(historyPath(leo), OTHER_ATHLETE_EMAIL);
        ResponseEntity<String> athleteOfAnother = get(historyPath(mia), ATHLETE_EMAIL);

        assertEquals(HttpStatus.FORBIDDEN, otherCoach.getStatusCode());
        assertEquals(ATHLETE_FORBIDDEN_MESSAGE, json(otherCoach).get("message").asString());
        assertEquals(HttpStatus.FORBIDDEN, otherAthlete.getStatusCode());
        assertEquals(HttpStatus.FORBIDDEN, athleteOfAnother.getStatusCode());
    }

    @Test
    void shouldReturn401WithoutToken() {
        ResponseEntity<String> response = get(historyPath(leo), null);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertEquals(UNAUTHORIZED_MESSAGE, json(response).get("message").asString());
    }

    @Test
    void shouldReturn404WhenTheAthleteDoesNotExist() {
        String unknown = "/api/athletes/" + UUID.randomUUID() + "/sessions";

        assertEquals(HttpStatus.NOT_FOUND, get(unknown, COACH_EMAIL).getStatusCode());
    }

    @Test
    void shouldReturnAnEmptyPageWhenTheAthleteHasNoClosedSession() {
        // Mía no tiene sesiones: la página vacía es una respuesta válida
        JsonNode body = json(get(historyPath(mia), COACH_EMAIL));

        assertTrue(body.get("content").isEmpty());
        assertEquals(0, body.get("totalElements").asInt());
        assertEquals(0, body.get("totalPages").asInt());
    }

    // ---------- helpers ----------

    private String historyPath(Athlete athlete) {
        return "/api/athletes/" + athlete.getId() + "/sessions";
    }

    // Sesión en progreso del día a mediodía de Argentina, como la deja el alta (fecha e instante de la misma hora)
    private TrainingSession session(RoutineAssignment assignment, RoutineDay day, LocalDate date) {
        return TrainingSession.start(assignment, day, middayInArgentina(date), date);
    }

    // Sesión de Leo finalizada 45 minutos después del inicio, guardada en la base
    private void closed(RoutineAssignment assignment, RoutineDay day, LocalDate date) {
        TrainingSession session = session(assignment, day, date);
        session.finish(session.getStartedAt().plusSeconds(2700));
        trainingSessionRepository.saveAndFlush(session);
    }

    private PerformedSet done(TrainingSession session, RoutineDay day, int index, String weight, int reps) {
        PerformedSet set = new PerformedSet(session, exerciseAt(day, 0), (short) (index + 1));
        set.markDone(new BigDecimal(weight), reps, null);
        return set;
    }

    private PerformedSet skipped(TrainingSession session, RoutineDay day, int index) {
        PerformedSet set = new PerformedSet(session, exerciseAt(day, 0), (short) (index + 1));
        set.markSkipped("Molestia en el hombro");
        return set;
    }

    // Press (índice 0) o remo (1) del torso
    private static RoutineExercise exerciseAt(RoutineDay day, int index) {
        return day.getExercises().get(index);
    }

    // Request con la sesión de ese email (null = sin token). Los 4xx no lanzan excepción: cada test los valida
    private ResponseEntity<String> get(String uri, String email) {
        return client.get()
                .uri(uri)
                .headers(headers -> {
                    if (email != null) {
                        AuthHeaders.authenticate(headers, client, email, RAW_PASSWORD);
                    }
                })
                .retrieve()
                .onStatus(status -> true, (req, res) -> {
                })
                .toEntity(String.class);
    }

    private JsonNode json(ResponseEntity<String> response) {
        return jsonMapper.readTree(response.getBody());
    }
}
