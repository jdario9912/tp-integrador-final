package com.gestion_deportiva.api.e2e;

import com.gestion_deportiva.api.ApiApplication;
import com.gestion_deportiva.api.TestcontainersConfiguration;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.repository.AthleteRepository;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.client.RestClient;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;
import tools.jackson.databind.json.JsonMapper;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static com.gestion_deportiva.api.e2e.RoleEndpointMatrixE2ETest.Access.ALLOWED;
import static com.gestion_deportiva.api.e2e.RoleEndpointMatrixE2ETest.Access.FORBIDDEN;
import static com.gestion_deportiva.api.e2e.RoleEndpointMatrixE2ETest.Access.UNAUTHORIZED;
import static com.gestion_deportiva.api.support.IdentityFixtures.RAW_PASSWORD;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

// Matriz rol × endpoint (US-04): qué pasa con cada endpoint sin token, con un entrenador y con un atleta.
// ALLOWED = la autorización pasa (puede responder 2xx, 400, 404...), nunca 401 ni 403.
// La pertenencia (qué atleta puede ver cada uno) se prueba en AthleteE2ETest; acá {id} es el atleta del
// entrenador, así que los dos roles tienen acceso.
// Cada endpoint nuevo tiene que sumar su fila: shouldHaveARowForEveryEndpoint falla si falta alguno.
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
class RoleEndpointMatrixE2ETest {

    enum Access { ALLOWED, UNAUTHORIZED, FORBIDDEN }

    enum Caller { ANONYMOUS, COACH, ATHLETE }

    record Row(HttpMethod method, String path, Access anonymous, Access coach, Access athlete) {

        Access expectedFor(Caller caller) {
            return switch (caller) {
                case ANONYMOUS -> anonymous;
                case COACH -> coach;
                case ATHLETE -> athlete;
            };
        }

        String endpoint() {
            return method.name() + " " + path;
        }

        @Override
        public String toString() {
            return endpoint();
        }
    }

    static final List<Row> MATRIX = List.of(
            // públicos
            new Row(HttpMethod.POST, "/api/coaches", ALLOWED, ALLOWED, ALLOWED),
            new Row(HttpMethod.POST, "/api/auth/login", ALLOWED, ALLOWED, ALLOWED),
            new Row(HttpMethod.POST, "/api/auth/refresh", ALLOWED, ALLOWED, ALLOWED),
            // cualquier usuario autenticado
            new Row(HttpMethod.GET, "/api/auth/me", UNAUTHORIZED, ALLOWED, ALLOWED),
            new Row(HttpMethod.POST, "/api/auth/logout", UNAUTHORIZED, ALLOWED, ALLOWED),
            // atletas
            new Row(HttpMethod.POST, "/api/athletes", UNAUTHORIZED, ALLOWED, FORBIDDEN),
            new Row(HttpMethod.GET, "/api/athletes/{id}", UNAUTHORIZED, ALLOWED, ALLOWED));

    private static final String COACH_EMAIL = "ana@test.com";
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
    @Qualifier("requestMappingHandlerMapping")
    private RequestMappingHandlerMapping handlerMapping;

    private RestClient client;

    private Athlete athlete;

    private Map<Caller, String> accessTokens;

    @BeforeEach
    void setUp() {
        client = RestClient.create("http://localhost:" + port);
        Coach coach = coachRepository.saveAndFlush(
                new Coach("Ana", "Paz", COACH_EMAIL, passwordEncoder.encode(RAW_PASSWORD)));
        athlete = athleteRepository.saveAndFlush(
                new Athlete("Leo", "Gil", ATHLETE_EMAIL, passwordEncoder.encode(RAW_PASSWORD), coach));
        accessTokens = Map.of(Caller.COACH, login(COACH_EMAIL), Caller.ATHLETE, login(ATHLETE_EMAIL));
    }

    // Sin @Transactional (la request corre en otro hilo): se limpia a mano. CASCADE borra también athletes
    @AfterEach
    void cleanUp() {
        jdbcTemplate.execute("TRUNCATE users CASCADE");
    }

    static Stream<Arguments> cases() {
        return MATRIX.stream()
                .flatMap(row -> Arrays.stream(Caller.values()).map(caller -> Arguments.of(row, caller)));
    }

    @ParameterizedTest(name = "{0} como {1}")
    @MethodSource("cases")
    void shouldApplyTheRoleMatrix(Row row, Caller caller) {
        // Act
        int status = call(row, caller).getStatusCode().value();

        // Assert
        String context = row + " como " + caller + " respondió " + status;
        switch (row.expectedFor(caller)) {
            case UNAUTHORIZED -> assertEquals(401, status, context);
            case FORBIDDEN -> assertEquals(403, status, context);
            case ALLOWED -> {
                assertNotEquals(401, status, context);
                assertNotEquals(403, status, context);
            }
        }
    }

    @Test
    void shouldHaveARowForEveryEndpoint() {
        // Arrange: todos los endpoints de los controllers del proyecto (sin springdoc ni los de Spring)
        Set<String> registered = new TreeSet<>();
        handlerMapping.getHandlerMethods().forEach((info, handler) -> {
            if (!handler.getBeanType().getPackageName().startsWith(ApiApplication.class.getPackageName())) {
                return;
            }
            for (String pattern : info.getPatternValues()) {
                for (RequestMethod method : info.getMethodsCondition().getMethods()) {
                    registered.add(method.name() + " " + pattern);
                }
            }
        });

        // Act
        Set<String> inMatrix = MATRIX.stream().map(Row::endpoint).collect(Collectors.toCollection(TreeSet::new));

        // Assert
        assertEquals(inMatrix, registered, "Cada endpoint necesita su fila en MATRIX (y su regla en SecurityConfig "
                + "si no es para los dos roles)");
    }

    private ResponseEntity<String> call(Row row, Caller caller) {
        RestClient.RequestBodySpec request = client.method(row.method())
                .uri(row.path().replace("{id}", athlete.getId().toString()))
                .headers(headers -> {
                    if (caller != Caller.ANONYMOUS) {
                        headers.setBearerAuth(accessTokens.get(caller));
                    }
                });
        // Body vacío: alcanza para pasar por la autorización (la validación puede responder 400)
        if (row.method() != HttpMethod.GET) {
            request = request.contentType(MediaType.APPLICATION_JSON).body("{}");
        }
        return request.retrieve()
                .onStatus(status -> true, (req, res) -> {
                })
                .toEntity(String.class);
    }

    private String login(String email) {
        ResponseEntity<String> response = client.post()
                .uri("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .body(jsonMapper.writeValueAsString(Map.of("email", email, "password", RAW_PASSWORD)))
                .retrieve()
                .toEntity(String.class);
        return jsonMapper.readTree(response.getBody()).get("accessToken").asString();
    }
}
