package com.gestion_deportiva.api.config;

import com.gestion_deportiva.api.common.exception.SecurityErrorHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

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
//                         Todo lo demás requiere autenticación
                        .anyRequest().authenticated()
                )
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(securityErrorHandler)
                        .accessDeniedHandler(securityErrorHandler)
                )
                .formLogin(Customizer.withDefaults())
                .httpBasic(Customizer.withDefaults());

        return http.build();
    }
}
