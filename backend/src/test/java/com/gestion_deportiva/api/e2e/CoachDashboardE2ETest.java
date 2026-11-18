package com.gestion_deportiva.api.e2e;

import com.gestion_deportiva.api.TestcontainersConfiguration;
import com.gestion_deportiva.api.assignment.model.RoutineAssignment;
import com.gestion_deportiva.api.assignment.repository.RoutineAssignmentRepository;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.repository.AthleteRepository;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
import com.gestion_deportiva.api.config.TimeZoneProperties;
import com.gestion_deportiva.api.routine.model.Routine;
import com.gestion_deportiva.api.routine.model.RoutineDay;
import com.gestion_deportiva.api.routine.repository.RoutineRepository;
import com.gestion_deportiva.api.support.AuthHeaders;
import com.gestion_deportiva.api.training.model.TrainingSession;
import com.gestion_deportiva.api.training.repository.TrainingSessionRepository;
import com.gestion_deportiva.api.weight.repository.WeightRecordRepository;
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

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;

import static com.gestion_deportiva.api.support.AssignmentFixtures.assignment;
import static com.gestion_deportiva.api.support.IdentityFixtures.RAW_PASSWORD;
import static com.gestion_deportiva.api.support.RoutineFixtures.routine;
import static com.gestion_deportiva.api.support.TrainingSessionFixtures.middayInArgentina;
import static com.gestion_deportiva.api.support.WeightRecordFixtures.weightRecord;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

// US-11 · Dashboard del entrenador: las cuatro métricas de la cartera por HTTP, el estado vacío y el 403 del atleta.
// Los casos borde de cada consulta se prueban en CoachDashboardRepositoryTest
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
class CoachDashboardE2ETest {

    private static final String DASHBOARD_PATH = "/api/coaches/me/dashboard";

    private static final String COACH_EMAIL = "ana@test.com";
    private static final String EMPTY_COACH_EMAIL = "bruno@test.com";
    private static final String ATHLETE_EMAIL = "leo@test.com";
    private static final String OTHER_ATHLETE_EMAIL = "mia@test.com";

    private static final String ROLE_FORBIDDEN_MESSAGE = "No tiene permisos para acceder a este recurso";

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
    private RoutineAssignmentRepository routineAssignmentRepository;

    @Autowired
    private TrainingSessionRepository trainingSessionRepository;

    @Autowired
    private WeightRecordRepository weightRecordRepository;

    private RestClient client;

    private Coach ana;

    private Athlete leo;

    private Athlete mia;

    @BeforeEach
    void setUp() {
        client = RestClient.create("http://localhost:" + port);
        ana = coachRepository.saveAndFlush(new Coach("Ana", "Paz", COACH_EMAIL, passwordEncoder.encode(RAW_PASSWORD)));
        coachRepository.saveAndFlush(new Coach("Bruno", "Gil", EMPTY_COACH_EMAIL, passwordEncoder.encode(RAW_PASSWORD)));
        leo = athleteRepository.saveAndFlush(
                new Athlete("Leo", "Gil", ATHLETE_EMAIL, passwordEncoder.encode(RAW_PASSWORD), ana));
        mia = athleteRepository.saveAndFlush(
                new Athlete("Mia", "Ruiz", OTHER_ATHLETE_EMAIL, passwordEncoder.encode(RAW_PASSWORD), ana));
    }

    // Sin @Transactional (la request corre en otro hilo): se limpia a mano
    @AfterEach
    void cleanUp() {
        jdbcTemplate.execute("TRUNCATE users CASCADE");
    }

    @Test
    void shouldReturnTheMetricsOfTheCoachPortfolio() {
        // Arrange: Leo tiene rutina sin vencimiento, pesó hoy y tiene un entrenamiento finalizado sin revisar; Mía no
        // tiene rutina ni pesos
        LocalDate today = LocalDate.now(ZoneId.of(TimeZoneProperties.DEFAULT_TIME_ZONE));
        Routine strength = routine("Fuerza", ana);
        RoutineDay upper = strength.addDay("Torso");
        strength = routineRepository.saveAndFlush(strength);
        RoutineAssignment leoAssignment = routineAssignmentRepository.saveAndFlush(
                assignment(leo, strength, today.minusDays(10)));
        TrainingSession session = TrainingSession.start(leoAssignment, upper, middayInArgentina(today.minusDays(1)),
                today.minusDays(1));
        session.finish(middayInArgentina(today.minusDays(1)).plus(45, ChronoUnit.MINUTES));
        trainingSessionRepository.saveAndFlush(session);
        weightRecordRepository.saveAndFlush(weightRecord(leo, today, "80.0"));

        // Act
        ResponseEntity<String> response = get(COACH_EMAIL);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals(2, body.get("activeAthletes").get("count").asInt());
        assertEquals(leo.getId().toString(), body.get("activeAthletes").get("athletes").get(0).get("id").asString());
        assertEquals("Gil", body.get("activeAthletes").get("athletes").get(0).get("lastName").asString());
        assertEquals(1, body.get("withoutRoutine").get("count").asInt());
        assertEquals(mia.getId().toString(), body.get("withoutRoutine").get("athletes").get(0).get("id").asString());
        assertEquals(1, body.get("pendingReviewSessions").get("count").asInt());
        JsonNode pending = body.get("pendingReviewSessions").get("athletes").get(0);
        assertEquals(leo.getId().toString(), pending.get("id").asString());
        assertEquals(1, pending.get("pendingCount").asInt());
        assertEquals(1, body.get("withoutRecentWeight").get("count").asInt());
        JsonNode withoutWeight = body.get("withoutRecentWeight").get("athletes").get(0);
        assertEquals(mia.getId().toString(), withoutWeight.get("id").asString());
        assertTrue(withoutWeight.get("lastRecordedOn").isNull());
        assertTrue(body.get("warnings").isEmpty());
    }

    @Test
    void shouldReturnEverythingInZeroForACoachWithoutAthletes() {
        ResponseEntity<String> response = get(EMPTY_COACH_EMAIL);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        JsonNode body = json(response);
        for (String metric : new String[]{"activeAthletes", "withoutRoutine", "pendingReviewSessions",
                "withoutRecentWeight"}) {
            assertEquals(0, body.get(metric).get("count").asInt(), metric);
            assertTrue(body.get(metric).get("athletes").isEmpty(), metric);
        }
        assertTrue(body.get("warnings").isEmpty());
    }

    @Test
    void shouldAnswer403ToAnAthlete() {
        ResponseEntity<String> response = get(ATHLETE_EMAIL);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals(ROLE_FORBIDDEN_MESSAGE, json(response).get("message").asString());
    }

    @Test
    void shouldAnswer401WithoutToken() {
        assertEquals(HttpStatus.UNAUTHORIZED, get(null).getStatusCode());
    }

    // ---------- helpers ----------

    // Request con la sesión de ese email (null = sin token); los 4xx no lanzan excepción
    private ResponseEntity<String> get(String email) {
        return client.get()
                .uri(DASHBOARD_PATH)
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
