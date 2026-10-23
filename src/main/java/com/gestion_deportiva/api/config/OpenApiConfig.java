package com.gestion_deportiva.api.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    // Provisorio hasta el login JWT: se reemplaza por un esquema "bearerAuth" (ver docs/AUTH.md).
    // Los controllers protegidos lo referencian con @SecurityRequirement(name = BASIC_AUTH_SCHEME)
    public static final String BASIC_AUTH_SCHEME = "basicAuth";

    @Value("${spring.application.name}")
    private String applicationName;

    @Bean
    public OpenAPI openApi() {
        return new OpenAPI()
                .info(new Info()
                        .title(applicationName)
                        .description("Documentación de la API de gestión deportiva")
                        .version("v1"))
                // Habilita el botón "Authorize" de Swagger UI (email y contraseña de un usuario registrado)
                .components(new Components().addSecuritySchemes(BASIC_AUTH_SCHEME, new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("basic")));
    }
}
