package com.gestion_deportiva.api.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    // Esquema del botón "Authorize" de Swagger UI: se pega el accessToken que devuelve /api/auth/login
    static final String BEARER_SCHEME = "bearerAuth";

    @Value("${spring.application.name}")
    private String applicationName;

    @Bean
    public OpenAPI openApi() {
        return new OpenAPI()
                .info(new Info()
                        .title(applicationName)
                        .description("Documentación de la API de gestión deportiva")
                        .version("v1"))
                .components(new Components().addSecuritySchemes(BEARER_SCHEME, new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")))
                // Por defecto todos los endpoints requieren token; los públicos lo anulan con @SecurityRequirements
                .addSecurityItem(new SecurityRequirement().addList(BEARER_SCHEME));
    }
}
