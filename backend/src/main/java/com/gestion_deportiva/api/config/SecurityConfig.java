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

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    // Endpoint público de registro de entrenadores (US-01)
    // Spring Security filtra por la URL real, por eso incluye el prefijo de WebConfig
    static final String COACH_REGISTRATION_PATH = WebConfig.API_PREFIX + "/coaches";

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
                                                   SecurityErrorHandler securityErrorHandler) throws Exception {
        http
                .authorizeHttpRequests(auth -> auth
                        // Health check abierto para balanceadores y orquestadores
                        .requestMatchers("/actuator/health/**").permitAll()
                        // Swagger UI / OpenAPI docs: deshabilitados a nivel de springdoc en prod,
                        // por eso no hace falta restringir el acceso acá por perfil
                        .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**").permitAll()
                        .requestMatchers(HttpMethod.POST, COACH_REGISTRATION_PATH).permitAll()
//                         Todo lo demás requiere autenticación
                        .anyRequest().authenticated()
                )
                // El registro lo consume un cliente JSON sin sesión: no hay token CSRF que enviar
                .csrf(csrf -> csrf.ignoringRequestMatchers(COACH_REGISTRATION_PATH))
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(securityErrorHandler)
                        .accessDeniedHandler(securityErrorHandler)
                )
                .formLogin(Customizer.withDefaults())
                .httpBasic(Customizer.withDefaults());

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
