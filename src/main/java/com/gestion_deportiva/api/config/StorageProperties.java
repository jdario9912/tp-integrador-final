package com.gestion_deportiva.api.config;

import jakarta.validation.constraints.NotNull;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.time.Duration;
import java.util.regex.Pattern;

// Configuración de Supabase Storage (app.storage.supabase.*, US-37).
// En dev las credenciales son opcionales: sin ellas la app arranca y el almacenamiento responde "no disponible".
// En prod application-prod.yml no les da valor por defecto, así que si faltan la app no arranca.
@Validated
@ConfigurationProperties(prefix = "app.storage.supabase")
public record StorageProperties(
        String url,
        String serviceRoleKey,
        String bucket,
        @NotNull Duration signedUrlTtl
) {

    // Esquema y host, sin path: la ruta /storage/v1 la agrega el adaptador
    private static final Pattern BASE_URL = Pattern.compile("https?://[^/\\s]+");

    public StorageProperties {
        url = blankToNull(url);
        serviceRoleKey = blankToNull(serviceRoleKey);
        bucket = blankToNull(bucket);
        if (url != null) {
            url = url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
            if (!BASE_URL.matcher(url).matches()) {
                throw new IllegalArgumentException("app.storage.supabase.url (SUPABASE_URL) es inválida: usar "
                        + "esquema y host, sin path (ej. https://<proyecto>.supabase.co)");
            }
        }
        if (signedUrlTtl != null && signedUrlTtl.toSeconds() < 1) {
            throw new IllegalArgumentException(
                    "app.storage.supabase.signed-url-ttl (STORAGE_SIGNED_URL_TTL) debe ser de al menos 1 segundo");
        }
    }

    // Las tres credenciales juntas; con alguna faltante el adaptador no llama a Supabase
    public boolean isConfigured() {
        return url != null && serviceRoleKey != null && bucket != null;
    }

    // El toString de un record mostraría la clave service_role: se oculta para que no llegue a ningún log
    @Override
    public String toString() {
        return "StorageProperties[url=" + url + ", serviceRoleKey=" + (serviceRoleKey == null ? null : "***")
                + ", bucket=" + bucket + ", signedUrlTtl=" + signedUrlTtl + "]";
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
