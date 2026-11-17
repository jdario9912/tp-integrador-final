package com.gestion_deportiva.api.config;

import com.gestion_deportiva.api.common.exception.SecurityErrorHandler;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.security.web.util.matcher.OrRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableConfigurationProperties(CorsProperties.class)
public class SecurityConfig {

    // Endpoints públicos: registro de entrenadores (US-01), login y refresh (US-02).
    // Spring Security filtra por la URL real, por eso incluyen el prefijo de WebConfig
    static final String COACH_REGISTRATION_PATH = WebConfig.API_PREFIX + "/coaches";
    static final String LOGIN_PATH = WebConfig.API_PREFIX + "/auth/login";
    static final String REFRESH_PATH = WebConfig.API_PREFIX + "/auth/refresh";

    private static final RequestMatcher PUBLIC_ENDPOINTS = new OrRequestMatcher(
            PathPatternRequestMatcher.pathPattern(HttpMethod.POST, COACH_REGISTRATION_PATH),
            PathPatternRequestMatcher.pathPattern(HttpMethod.POST, LOGIN_PATH),
            PathPatternRequestMatcher.pathPattern(HttpMethod.POST, REFRESH_PATH));

    // Endpoints con access token (US-04): cada uno declara acá qué rol lo puede usar
    static final String ME_PATH = WebConfig.API_PREFIX + "/auth/me";
    static final String LOGOUT_PATH = WebConfig.API_PREFIX + "/auth/logout";
    static final String ATHLETES_PATH = WebConfig.API_PREFIX + "/athletes";
    static final String ATHLETE_PATH = ATHLETES_PATH + "/{id}";
    static final String ATHLETE_DEACTIVATE_PATH = ATHLETE_PATH + "/deactivate";
    static final String ATHLETE_REACTIVATE_PATH = ATHLETE_PATH + "/reactivate";
    static final String ATHLETE_UNLINK_PATH = ATHLETE_PATH + "/unlink";
    static final String EXERCISES_PATH = WebConfig.API_PREFIX + "/exercises";
    static final String EXERCISE_PATH = EXERCISES_PATH + "/{id}";
    static final String MUSCLE_GROUPS_PATH = WebConfig.API_PREFIX + "/muscle-groups";
    static final String ROUTINES_PATH = WebConfig.API_PREFIX + "/routines";
    static final String ROUTINE_PATH = ROUTINES_PATH + "/{id}";
    static final String ROUTINE_DAYS_PATH = ROUTINE_PATH + "/days";
    static final String ROUTINE_DUPLICATE_PATH = ROUTINE_PATH + "/duplicate";
    static final String ATHLETE_WEIGHTS_PATH = ATHLETES_PATH + "/{athleteId}/weights";
    static final String ATHLETE_WEIGHT_PATH = ATHLETE_WEIGHTS_PATH + "/{weightId}";
    static final String ATHLETE_ASSIGNMENTS_PATH = ATHLETES_PATH + "/{athleteId}/assignments";
    static final String ATHLETE_ROUTINE_PATH = ATHLETES_PATH + "/{athleteId}/routine";
    static final String ATHLETE_SESSIONS_PATH = ATHLETES_PATH + "/{athleteId}/sessions";
    static final String ATHLETE_SESSION_IN_PROGRESS_PATH = ATHLETE_SESSIONS_PATH + "/in-progress";
    static final String ATHLETE_SESSION_PATH = ATHLETE_SESSIONS_PATH + "/{sessionId}";
    static final String FOODS_PATH = WebConfig.API_PREFIX + "/foods";
    static final String FOOD_PATH = FOODS_PATH + "/{id}";
    // US-19 · Series registradas en vivo (contrato 11)
    static final String ATHLETE_SESSION_SET_PATH = ATHLETE_SESSION_PATH + "/exercises/{routineExerciseId}/sets/{setNumber}";
    // US-28 (bloque propio): fotos de progreso
    static final String ATHLETE_PHOTOS_PATH = ATHLETES_PATH + "/{athleteId}/photos";
    static final String ATHLETE_PHOTO_PATH = ATHLETE_PHOTOS_PATH + "/{photoId}";
    // US-23: registro de comidas del atleta
    static final String ATHLETE_MEALS_PATH = ATHLETES_PATH + "/{athleteId}/meals";
    static final String ATHLETE_MEAL_PATH = ATHLETE_MEALS_PATH + "/{mealId}";
    // US-20 · finalizar y cancelar la sesión en progreso (contrato 14)
    static final String ATHLETE_SESSION_FINISH_PATH = ATHLETE_SESSION_PATH + "/finish";
    static final String ATHLETE_SESSION_CANCEL_PATH = ATHLETE_SESSION_PATH + "/cancel";
    // US-21 · historial (ATHLETE_SESSIONS_PATH, de US-18) y revisión de la sesión (contrato 15)
    static final String ATHLETE_SESSION_REVIEW_PATH = ATHLETE_SESSION_PATH + "/review";
    // US-24 · resumen nutricional del día (contrato 16): una subruta de /meals, distinta de /meals/{mealId}
    static final String ATHLETE_MEALS_SUMMARY_PATH = ATHLETE_MEALS_PATH + "/summary";
    // US-25 · alimentación por rango y revisión de una comida
    static final String ATHLETE_MEALS_OVERVIEW_PATH = ATHLETE_MEALS_PATH + "/overview";
    static final String ATHLETE_MEAL_REVIEW_PATH = ATHLETE_MEAL_PATH + "/review";

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
                                                   SecurityErrorHandler securityErrorHandler,
                                                   JwtAuthenticationConverter jwtAuthenticationConverter) throws Exception {
        http
                // Usa el bean corsConfigurationSource; corre antes de la autenticación para que el preflight no dé 401
                .cors(Customizer.withDefaults())
                .authorizeHttpRequests(auth -> auth
                        // Health check abierto para balanceadores y orquestadores
                        .requestMatchers("/actuator/health/**").permitAll()
                        // Swagger UI / OpenAPI docs: deshabilitados a nivel de springdoc en prod,
                        // por eso no hace falta restringir el acceso acá por perfil
                        .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**").permitAll()
                        .requestMatchers(PUBLIC_ENDPOINTS).permitAll()
                        // Matriz rol × endpoint (US-04). La regla de rol vive acá y no en @PreAuthorize porque
                        // corre antes de leer el body: un rol equivocado recibe 403 aunque el body sea inválido.
                        // hasRole("COACH") exige la authority ROLE_COACH (claim "role" del JWT, ver JwtConfig):
                        // sin token responde 401 y con el rol equivocado 403.
                        // Cada endpoint tiene además su fila en RoleEndpointMatrixE2ETest (el test falla si falta).
                        .requestMatchers(HttpMethod.GET, ME_PATH).authenticated()
                        .requestMatchers(HttpMethod.POST, LOGOUT_PATH).authenticated()
                        .requestMatchers(HttpMethod.POST, ATHLETES_PATH).hasRole("COACH")
                        // "Mis atletas": la consulta filtra por el entrenador del token (US-08)
                        .requestMatchers(HttpMethod.GET, ATHLETES_PATH).hasRole("COACH")
                        // Los dos roles; qué atleta puede ver cada uno lo decide AthleteAccessGuard (pertenencia)
                        .requestMatchers(HttpMethod.GET, ATHLETE_PATH).hasAnyRole("COACH", "ATHLETE")
                        // Editar, desactivar/reactivar, desvincular y eliminar (US-07): solo el entrenador dueño
                        .requestMatchers(HttpMethod.PUT, ATHLETE_PATH).hasRole("COACH")
                        .requestMatchers(HttpMethod.DELETE, ATHLETE_PATH).hasRole("COACH")
                        .requestMatchers(HttpMethod.POST, ATHLETE_DEACTIVATE_PATH).hasRole("COACH")
                        .requestMatchers(HttpMethod.POST, ATHLETE_REACTIVATE_PATH).hasRole("COACH")
                        .requestMatchers(HttpMethod.PATCH, ATHLETE_UNLINK_PATH).hasRole("COACH")
                        // Registros de peso (US-26): el atleta registra y corrige los suyos (el entrenador recibe
                        // 403 aunque el atleta sea suyo); el listado lo ven los dos roles. Qué atleta puede usar
                        // cada uno lo decide AthleteAccessGuard en WeightRecordService
                        .requestMatchers(HttpMethod.POST, ATHLETE_WEIGHTS_PATH).hasRole("ATHLETE")
                        .requestMatchers(HttpMethod.PUT, ATHLETE_WEIGHT_PATH).hasRole("ATHLETE")
                        .requestMatchers(HttpMethod.GET, ATHLETE_WEIGHTS_PATH).hasAnyRole("COACH", "ATHLETE")
                        // Grupos musculares (US-38): catálogo fijo; también el atleta, para mostrar el nombre del
                        // grupo de cada ejercicio de su rutina (US-17, D-019)
                        .requestMatchers(HttpMethod.GET, MUSCLE_GROUPS_PATH).hasAnyRole("COACH", "ATHLETE")
                        // Catálogo de ejercicios (US-38): solo entrenadores; la autoría la controla ExerciseService
                        .requestMatchers(HttpMethod.GET, EXERCISES_PATH, EXERCISE_PATH).hasRole("COACH")
                        .requestMatchers(HttpMethod.POST, EXERCISES_PATH).hasRole("COACH")
                        .requestMatchers(HttpMethod.PUT, EXERCISE_PATH).hasRole("COACH")
                        .requestMatchers(HttpMethod.DELETE, EXERCISE_PATH).hasRole("COACH")
                        // Rutinas (US-13 a US-15): solo entrenadores; la pertenencia la controla RoutineService
                        .requestMatchers(HttpMethod.POST, ROUTINES_PATH, ROUTINE_DUPLICATE_PATH).hasRole("COACH")
                        .requestMatchers(HttpMethod.GET, ROUTINES_PATH, ROUTINE_PATH).hasRole("COACH")
                        .requestMatchers(HttpMethod.PUT, ROUTINE_PATH, ROUTINE_DAYS_PATH).hasRole("COACH")
                        // Asignación de rutinas e historial (US-16): solo entrenadores; la pertenencia del atleta y
                        // de la rutina la controla RoutineAssignmentService
                        .requestMatchers(HttpMethod.POST, ATHLETE_ASSIGNMENTS_PATH).hasRole("COACH")
                        .requestMatchers(HttpMethod.GET, ATHLETE_ASSIGNMENTS_PATH).hasRole("COACH")
                        // Rutina activa del atleta (US-17): los dos roles; qué atleta puede ver cada uno lo decide
                        // AthleteAccessGuard en AthleteRoutineService
                        .requestMatchers(HttpMethod.GET, ATHLETE_ROUTINE_PATH).hasAnyRole("COACH", "ATHLETE")
                        // Sesiones de entrenamiento (US-18): solo el atleta inicia las suyas (el entrenador recibe
                        // 403 aunque el atleta sea suyo); la sesión en progreso y el detalle los leen los dos roles.
                        // Qué atleta puede usar cada uno lo decide AthleteAccessGuard en TrainingSessionService
                        .requestMatchers(HttpMethod.POST, ATHLETE_SESSIONS_PATH).hasRole("ATHLETE")
                        .requestMatchers(HttpMethod.GET, ATHLETE_SESSION_IN_PROGRESS_PATH, ATHLETE_SESSION_PATH)
                                .hasAnyRole("COACH", "ATHLETE")
                        // Catálogo de alimentos (US-39): global, lo consultan los dos roles y solo los
                        // entrenadores crean y editan
                        .requestMatchers(HttpMethod.GET, FOODS_PATH, FOOD_PATH).hasAnyRole("COACH", "ATHLETE")
                        .requestMatchers(HttpMethod.POST, FOODS_PATH).hasRole("COACH")
                        .requestMatchers(HttpMethod.PUT, FOOD_PATH).hasRole("COACH")
                        // US-19 · Series registradas en vivo: solo el atleta registra y corrige las suyas (el entrenador
                        // recibe 403 aunque el atleta sea suyo). Qué atleta puede usar cada uno lo decide PerformedSetService
                        .requestMatchers(HttpMethod.PUT, ATHLETE_SESSION_SET_PATH).hasRole("ATHLETE")
                        // US-28 (bloque propio): fotos de progreso. Subir y borrar solo el atleta (el entrenador recibe
                        // 403 aunque el atleta sea suyo); listar y ver el detalle, los dos roles. Qué atleta puede usar
                        // cada uno lo decide AthleteAccessGuard en ProgressPhotoService
                        .requestMatchers(HttpMethod.POST, ATHLETE_PHOTOS_PATH).hasRole("ATHLETE")
                        .requestMatchers(HttpMethod.GET, ATHLETE_PHOTOS_PATH, ATHLETE_PHOTO_PATH)
                                .hasAnyRole("COACH", "ATHLETE")
                        .requestMatchers(HttpMethod.DELETE, ATHLETE_PHOTO_PATH).hasRole("ATHLETE")
                        // US-23: registro de comidas. Alta, edición y borrado los hace solo el atleta (el entrenador
                        // recibe 403 aunque el atleta sea suyo); el listado del día lo ven los dos roles. Qué atleta
                        // puede usar cada uno lo decide AthleteAccessGuard en MealServiceImpl
                        .requestMatchers(HttpMethod.POST, ATHLETE_MEALS_PATH).hasRole("ATHLETE")
                        .requestMatchers(HttpMethod.PUT, ATHLETE_MEAL_PATH).hasRole("ATHLETE")
                        .requestMatchers(HttpMethod.DELETE, ATHLETE_MEAL_PATH).hasRole("ATHLETE")
                        .requestMatchers(HttpMethod.GET, ATHLETE_MEALS_PATH).hasAnyRole("COACH", "ATHLETE")
                        // US-20 · Finalizar y cancelar la sesión en progreso: solo el atleta (el entrenador recibe 403
                        // aunque el atleta sea suyo). Qué atleta puede usar cada uno lo decide TrainingSessionService
                        .requestMatchers(HttpMethod.POST, ATHLETE_SESSION_FINISH_PATH, ATHLETE_SESSION_CANCEL_PATH)
                                .hasRole("ATHLETE")
                        // US-21 · Historial de sesiones cerradas: lo leen los dos roles (el atleta, las suyas; el
                        // entrenador, las de sus atletas). Qué atleta puede usar cada uno lo decide
                        // TrainingSessionHistoryService
                        .requestMatchers(HttpMethod.GET, ATHLETE_SESSIONS_PATH).hasAnyRole("COACH", "ATHLETE")
                        // US-21 · Revisión de una sesión finalizada: solo el entrenador (el atleta recibe 403 aunque la
                        // sesión sea suya). Qué atleta puede usar cada uno lo decide TrainingSessionReviewService
                        .requestMatchers(HttpMethod.PUT, ATHLETE_SESSION_REVIEW_PATH).hasRole("COACH")
                        // US-24 · Resumen nutricional del día: los dos roles (el atleta, el suyo; el entrenador, el de sus
                        // atletas). Va explícita para que el GET de /summary no dependa de la red de seguridad. Qué atleta
                        // puede usar cada uno lo decide AthleteAccessGuard en MealServiceImpl
                        .requestMatchers(HttpMethod.GET, ATHLETE_MEALS_SUMMARY_PATH).hasAnyRole("COACH", "ATHLETE")
                        // US-25 · Alimentación por rango: los dos roles (explícita, igual que /summary). Revisión de una
                        // comida: solo el entrenador (el atleta recibe 403 aunque la comida sea suya). Qué atleta puede
                        // usar cada uno lo decide AthleteAccessGuard en MealServiceImpl y MealReviewService
                        .requestMatchers(HttpMethod.GET, ATHLETE_MEALS_OVERVIEW_PATH).hasAnyRole("COACH", "ATHLETE")
                        .requestMatchers(HttpMethod.PUT, ATHLETE_MEAL_REVIEW_PATH).hasRole("COACH")
                        // Red de seguridad: lo que no tenga regla exige al menos un access token válido
                        .anyRequest().authenticated()
                )
                // API stateless: el access token viaja en el header Authorization, sin sesión ni cookies,
                // así que no hay un token CSRF que proteger
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // Resource Server: valida firma, emisor y vencimiento del JWT con el JwtDecoder de JwtConfig.
                // Un token vencido o manipulado responde 401 con el formato estándar de SecurityErrorHandler
                .oauth2ResourceServer(oauth2 -> oauth2
                        .bearerTokenResolver(bearerTokenResolver())
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter))
                        .authenticationEntryPoint(securityErrorHandler)
                        .accessDeniedHandler(securityErrorHandler)
                )
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(securityErrorHandler)
                        .accessDeniedHandler(securityErrorHandler)
                );

        return http.build();
    }

    // En los endpoints públicos se ignora el header Authorization: si el front manda un access token
    // vencido al refrescar, el filtro del JWT lo rechazaría con 401 antes de llegar al endpoint
    private static BearerTokenResolver bearerTokenResolver() {
        DefaultBearerTokenResolver delegate = new DefaultBearerTokenResolver();
        return request -> PUBLIC_ENDPOINTS.matches(request) ? null : delegate.resolve(request);
    }

    // Solo los orígenes del front (CORS_ALLOWED_ORIGINS). Un preflight de otro origen recibe 403 y el
    // navegador bloquea la respuesta. Sin allowCredentials: el token viaja en Authorization, no en cookies
    @Bean
    public CorsConfigurationSource corsConfigurationSource(CorsProperties corsProperties) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(corsProperties.allowedOrigins());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
