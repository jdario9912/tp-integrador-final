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
