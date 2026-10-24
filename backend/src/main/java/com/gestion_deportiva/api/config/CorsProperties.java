package com.gestion_deportiva.api.config;

import jakarta.validation.constraints.NotEmpty;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.util.List;
import java.util.regex.Pattern;

// Orígenes del front que pueden llamar a la API desde el navegador (app.cors.allowed-origins, US-04).
// Si falta o es inválido, la app no arranca: en prod CORS_ALLOWED_ORIGINS es obligatoria.
@Validated
@ConfigurationProperties(prefix = "app.cors")
public record CorsProperties(@NotEmpty List<String> allowedOrigins) {

    // Esquema y host (con puerto opcional), sin path ni barra final: así compara el navegador el origen
    private static final Pattern ORIGIN = Pattern.compile("https?://[^/\\s*]+");

    public CorsProperties {
        if (allowedOrigins != null) {
            allowedOrigins = allowedOrigins.stream().map(String::trim).toList();
            for (String origin : allowedOrigins) {
                if (!ORIGIN.matcher(origin).matches()) {
                    throw new IllegalArgumentException("app.cors.allowed-origins (CORS_ALLOWED_ORIGINS) tiene un "
                            + "origen inválido: '" + origin + "'. Usar esquema y host, sin '*' ni barra final "
                            + "(ej. https://app.ejemplo.com)");
                }
            }
        }
    }
}
