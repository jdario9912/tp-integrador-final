package com.gestion_deportiva.api.config;

import com.gestion_deportiva.api.common.exception.SecurityErrorHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    // Endpoint público de registro de entrenadores (US-01)
    // Spring Security filtra por la URL real, por eso incluye el prefijo de WebConfig
    static final String COACH_REGISTRATION_PATH = WebConfig.API_PREFIX + "/coaches";

    // Alta de atletas: solo entrenadores autenticados
    static final String ATHLETES_PATH = WebConfig.API_PREFIX + "/athletes";

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
                                                   SecurityErrorHandler securityErrorHandler) throws Exception {
        http
                // Usa el bean corsConfigurationSource; corre antes de la autenticación para que el preflight no dé 401
                .cors(Customizer.withDefaults())
                .authorizeHttpRequests(auth -> auth
                        // Health check abierto para balanceadores y orquestadores
                        .requestMatchers("/actuator/health/**").permitAll()
                        // Swagger UI / OpenAPI docs: deshabilitados a nivel de springdoc en prod,
                        // por eso no hace falta restringir el acceso acá por perfil
                        .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**").permitAll()
                        .requestMatchers(HttpMethod.POST, COACH_REGISTRATION_PATH).permitAll()
                        // hasRole("COACH") exige la authority "ROLE_COACH" de AuthenticatedUser:
                        // sin credenciales responde 401 y un atleta autenticado recibe 403
                        .requestMatchers(HttpMethod.POST, ATHLETES_PATH).hasRole("COACH")
//                         Todo lo demás requiere autenticación
                        .anyRequest().authenticated()
                )
                // Clientes JSON que se autentican con el header Authorization (no con cookie de sesión):
                // no hay token CSRF que enviar. Con JWT se deshabilita CSRF para toda la API (ver docs/AUTH.md)
                .csrf(csrf -> csrf.ignoringRequestMatchers(COACH_REGISTRATION_PATH, ATHLETES_PATH))
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(securityErrorHandler)
                        .accessDeniedHandler(securityErrorHandler)
                )
                // Provisorio hasta el login JWT (ver docs/AUTH.md): httpBasic valida email y contraseña
                // contra la tabla users mediante DatabaseUserDetailsService
                .formLogin(Customizer.withDefaults())
                .httpBasic(Customizer.withDefaults());

        return http.build();
    }

    // Por ahora se acepta cualquier origen; restringir a los dominios del front antes de prod.
    // Sin allowCredentials: con "*" el navegador no envía cookies (un token en Authorization sí funciona)
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("*"));
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
