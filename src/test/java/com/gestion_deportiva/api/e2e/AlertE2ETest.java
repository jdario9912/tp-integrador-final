package com.gestion_deportiva.api.e2e;

import com.gestion_deportiva.api.TestcontainersConfiguration;
import com.gestion_deportiva.api.alert.exception.AlertAccessDeniedException;
import com.gestion_deportiva.api.alert.exception.AlertAlreadyHandledException;
import com.gestion_deportiva.api.alert.service.AlertEvaluator;
import com.gestion_deportiva.api.assignment.repository.RoutineAssignmentRepository;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.repository.AthleteRepository;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
import com.gestion_deportiva.api.config.TimeZoneProperties;
import com.gestion_deportiva.api.routine.model.Routine;
import com.gestion_deportiva.api.routine.repository.RoutineRepository;
import com.gestion_deportiva.api.support.AuthHeaders;
import com.gestion_deportiva.api.weight.repository.WeightRecordRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

import static com.gestion_deportiva.api.support.AssignmentFixtures.assignment;
import static com.gestion_deportiva.api.support.IdentityFixtures.RAW_PASSWORD;
import static com.gestion_deportiva.api.support.RoutineFixtures.routine;
import static com.gestion_deportiva.api.support.WeightRecordFixtures.weightRecord;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

// US-47 · Alertas: evaluación al consultar y por el job, sin duplicados, atención (con fecha y entrenador), período de
// gracia, pertenencia y roles. Leo tiene una rutina de 4 días por semana desde hace 20 días, sin entrenamientos ni
// pesos; Mía no tiene rutina y pesó hoy; Zoe es de otro entrenador
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
class AlertE2ETest {

    private static final String ALERTS_PATH = "/api/alerts";

    private static final String COACH_EMAIL = "ana@test.com";
    private static final String OTHER_COACH_EMAIL = "bruno@test.com";
    private static final String ATHLETE_EMAIL = "leo@test.com";

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
    private WeightRecordRepository weightRecordRepository;

    @Autowired
    private AlertEvaluator alertEvaluator;

    private RestClient client;

    private Coach ana;

    private Athlete leo;

    private Athlete mia;

    private Athlete zoe;

    @BeforeEach
    void setUp() {
        client = RestClient.create("http://localhost:" + port);
        LocalDate today = LocalDate.now(ZoneId.of(TimeZoneProperties.DEFAULT_TIME_ZONE));
        ana = coachRepository.saveAndFlush(new Coach("Ana", "Paz", COACH_EMAIL, passwordEncoder.encode(RAW_PASSWORD)));
        Coach bruno = coachRepository.saveAndFlush(
                new Coach("Bruno", "Sosa", OTHER_COACH_EMAIL, passwordEncoder.encode(RAW_PASSWORD)));
        leo = athleteRepository.saveAndFlush(
                new Athlete("Leo", "Gil", ATHLETE_EMAIL, passwordEncoder.encode(RAW_PASSWORD), ana));
        mia = athleteRepository.saveAndFlush(
                new Athlete("Mía", "Ruiz", "mia@test.com", passwordEncoder.encode(RAW_PASSWORD), ana));
        zoe = athleteRepository.saveAndFlush(
                new Athlete("Zoe", "Lima", "zoe@test.com", passwordEncoder.encode(RAW_PASSWORD), bruno));

        Routine strength = routine("Fuerza", ana);
        strength.setDaysPerWeek((short) 4);
        strength.addDay("Torso");
        strength = routineRepository.saveAndFlush(strength);
        routineAssignmentRepository.saveAndFlush(assignment(leo, strength, today.minusDays(20)));
        weightRecordRepository.saveAndFlush(weightRecord(mia, today, "60.0"));
        weightRecordRepository.saveAndFlush(weightRecord(zoe, today, "55.0"));
    }

    // Sin @Transactional (la request corre en otro hilo): se limpia a mano. CASCADE vacía también las alertas
    @AfterEach
    void cleanUp() {
        jdbcTemplate.execute("TRUNCATE users CASCADE");
    }

    // ---------- GET /api/alerts ----------

    @Test
    void shouldEvaluateThePortfolioAndListThePendingAlertsMostSevereFirst() {
        // Act
        ResponseEntity<String> response = get(COACH_EMAIL);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        JsonNode alerts = json(response);
        assertEquals(Set.of(
                        leo.getId() + " INACTIVITY CRITICAL",
                        leo.getId() + " LOW_COMPLIANCE WARNING",
                        leo.getId() + " NO_WEIGHT_LOG INFO",
                        mia.getId() + " NO_ROUTINE WARNING"),
                keys(alerts));
        assertEquals("CRITICAL", alerts.get(0).get("severity").asString());
        assertEquals("INFO", alerts.get(alerts.size() - 1).get("severity").asString());

        JsonNode inactivity = alerts.get(0);
        assertEquals("Leo Gil", inactivity.get("athleteName").asString());
        assertEquals("No finalizó ningún entrenamiento en los últimos 14 días", inactivity.get("message").asString());
        assertTrue(inactivity.hasNonNull("generatedAt"));
        assertTrue(inactivity.get("handledAt").isNull());
        assertEquals("Finalizó 0 de 4 entrenamientos planificados en los últimos 7 días",
                find(alerts, "LOW_COMPLIANCE").get("message").asString());
        // Zoe es de otro entrenador: su alerta no se evalúa ni aparece
        assertEquals(0, countAlerts(zoe));
    }

    @Test
    void shouldNotDuplicateAnOpenAlert() {
        // Act
        get(COACH_EMAIL);
        ResponseEntity<String> second = get(COACH_EMAIL);

        // Assert
        assertEquals(4, json(second).size());
        assertEquals(3, countAlerts(leo));
        assertEquals(1, countAlerts(mia));
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

    // ---------- PATCH /api/alerts/{id}/handle ----------

    @Test
    void shouldHandleTheAlertAndNotReopenItWhileTheConditionPersists() {
        // Arrange
        String alertId = find(json(get(COACH_EMAIL)), "NO_ROUTINE").get("id").asString();

        // Act
        ResponseEntity<String> response = handle(alertId, COACH_EMAIL);

        // Assert: respuesta y base (quién y cuándo)
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(json(response).hasNonNull("handledAt"));
        assertEquals(ana.getId().toString(), jdbcTemplate.queryForObject(
                "select handled_by::text from alerts where id = ?::uuid and handled_at is not null", String.class,
                alertId));

        // Assert: Mía sigue sin rutina, pero la alerta atendida no reaparece (período de gracia)
        JsonNode pending = json(get(COACH_EMAIL));
        assertFalse(keys(pending).contains(mia.getId() + " NO_ROUTINE WARNING"));
        assertEquals(1, countAlerts(mia));
    }

    @Test
    void shouldReturn409WhenTheAlertWasAlreadyHandled() {
        // Arrange
        String alertId = find(json(get(COACH_EMAIL)), "NO_ROUTINE").get("id").asString();
        handle(alertId, COACH_EMAIL);

        // Act
        ResponseEntity<String> response = handle(alertId, COACH_EMAIL);

        // Assert
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertEquals(AlertAlreadyHandledException.MESSAGE, json(response).get("message").asString());
    }

    @Test
    void shouldReturn403WhenTheAlertBelongsToAnotherCoachPortfolio() {
        // Arrange: la alerta de Zoe (sin rutina) la genera la consulta de Bruno
        String alertId = json(get(OTHER_COACH_EMAIL)).get(0).get("id").asString();

        // Act
        ResponseEntity<String> response = handle(alertId, COACH_EMAIL);

        // Assert
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals(AlertAccessDeniedException.MESSAGE, json(response).get("message").asString());
        assertTrue(jdbcTemplate.queryForObject("select handled_at is null from alerts where id = ?::uuid",
                Boolean.class, alertId));
    }

    @Test
    void shouldReturn404WhenTheAlertDoesNotExist() {
        assertEquals(HttpStatus.NOT_FOUND, handle(UUID.randomUUID().toString(), COACH_EMAIL).getStatusCode());
    }

    // ---------- job diario ----------

    @Test
    void shouldEvaluateEveryPortfolioFromTheDailyJob() {
        // Act: lo que corre AlertScheduler
        alertEvaluator.evaluateAll();

        // Assert
        assertEquals(3, countAlerts(leo));
        assertEquals(1, countAlerts(mia));
        assertEquals(1, countAlerts(zoe));
    }

    // ---------- helpers ----------

    private ResponseEntity<String> get(String email) {
        return exchange(HttpMethod.GET, ALERTS_PATH, email);
    }

    private ResponseEntity<String> handle(String alertId, String email) {
        return exchange(HttpMethod.PATCH, ALERTS_PATH + "/" + alertId + "/handle", email);
    }

    // Request con la sesión de ese email (null = sin token); los 4xx no lanzan excepción
    private ResponseEntity<String> exchange(HttpMethod method, String uri, String email) {
        return client.method(method)
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

    // "atleta tipo severidad" de cada alerta
    private static Set<String> keys(JsonNode alerts) {
        Set<String> keys = new HashSet<>();
        alerts.forEach(alert -> keys.add(alert.get("athleteId").asString() + " " + alert.get("type").asString()
                + " " + alert.get("severity").asString()));
        return keys;
    }

    private static JsonNode find(JsonNode alerts, String type) {
        for (JsonNode alert : alerts) {
            if (alert.get("type").asString().equals(type)) {
                return alert;
            }
        }
        throw new AssertionError("No hay una alerta " + type + " en " + alerts);
    }

    private int countAlerts(Athlete athlete) {
        return jdbcTemplate.queryForObject("select count(*) from alerts where athlete_id = ?", Integer.class,
                athlete.getId());
    }
}
