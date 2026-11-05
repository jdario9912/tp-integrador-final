package com.gestion_deportiva.api.storage;

import com.gestion_deportiva.api.config.StorageProperties;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.net.URI;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;
import java.util.regex.Pattern;

// Adaptador de ObjectStorage sobre la API REST de Supabase Storage (la misma que usa el cliente oficial
// storage-js). Se autentica con la clave service_role, que solo vive en el backend.
public class SupabaseObjectStorage implements ObjectStorage {

    static final String STORAGE_PATH = "/storage/v1";

    // Segmentos con letras, números, '.', '_' y '-' separados por '/': no hace falta codificar la URL
    // y se descartan rutas como "../otro-bucket"
    private static final Pattern OBJECT_PATH =
            Pattern.compile("[A-Za-z0-9_-][A-Za-z0-9._-]*(/[A-Za-z0-9_-][A-Za-z0-9._-]*)*");

    private final StorageProperties properties;
    private final RestClient restClient;
    private final Clock clock;

    public SupabaseObjectStorage(StorageProperties properties, RestClient.Builder restClientBuilder, Clock clock) {
        this.properties = properties;
        this.clock = clock;
        this.restClient = restClientBuilder
                .defaultHeaders(headers -> {
                    if (properties.isConfigured()) {
                        headers.setBearerAuth(properties.serviceRoleKey());
                        headers.set("apikey", properties.serviceRoleKey());
                    }
                })
                .build();
    }

    @Override
    public void upload(String objectPath, byte[] content, String contentType) {
        URI uri = objectUri("/object/", objectPath);
        call("subir", objectPath, () -> restClient.post()
                .uri(uri)
                .contentType(MediaType.parseMediaType(contentType))
                .header("x-upsert", "false")
                .body(content)
                .retrieve()
                .toBodilessEntity());
    }

    @Override
    public SignedUrl createSignedUrl(String objectPath) {
        return createSignedUrl(objectPath, properties.signedUrlTtl());
    }

    @Override
    public SignedUrl createSignedUrl(String objectPath, Duration ttl) {
        if (ttl == null || ttl.toSeconds() < 1) {
            throw new IllegalArgumentException("El vencimiento de la URL firmada debe ser de al menos 1 segundo");
        }
        URI uri = objectUri("/object/sign/", objectPath);
        // Se toma antes de la llamada: así expiresAt nunca es posterior al vencimiento real
        Instant expiresAt = clock.instant().plusSeconds(ttl.toSeconds());
        SignResponse response = call("firmar", objectPath, () -> restClient.post()
                .uri(uri)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("expiresIn", ttl.toSeconds()))
                .retrieve()
                .body(SignResponse.class));
        if (response == null || response.signedURL() == null || response.signedURL().isBlank()) {
            throw new StorageUnavailableException("Supabase no devolvió la URL firmada de " + objectPath);
        }
        // signedURL es relativa a /storage/v1 (ej. "/object/sign/<bucket>/<ruta>?token=...")
        return new SignedUrl(properties.url() + STORAGE_PATH + response.signedURL(), expiresAt);
    }

    @Override
    public void delete(String objectPath) {
        requireValidPath(objectPath);
        URI uri = storageUri("/object/" + properties.bucket());
        call("borrar", objectPath, () -> restClient.method(HttpMethod.DELETE)
                .uri(uri)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("prefixes", List.of(objectPath)))
                .retrieve()
                .toBodilessEntity());
    }

    private URI objectUri(String operationPath, String objectPath) {
        requireValidPath(objectPath);
        return storageUri(operationPath + properties.bucket() + "/" + objectPath);
    }

    private URI storageUri(String path) {
        if (!properties.isConfigured()) {
            throw new StorageUnavailableException("Supabase Storage no está configurado "
                    + "(faltan SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY o SUPABASE_STORAGE_BUCKET)");
        }
        return URI.create(properties.url() + STORAGE_PATH + path);
    }

    private static void requireValidPath(String objectPath) {
        if (objectPath == null || !OBJECT_PATH.matcher(objectPath).matches()) {
            throw new IllegalArgumentException("Ruta de objeto inválida: " + objectPath);
        }
    }

    // Traduce cualquier fallo HTTP (timeout, conexión rechazada, 4xx, 5xx) a la excepción del puerto.
    // El mensaje solo lleva la operación, la ruta y el status: nunca cabeceras (ahí va la clave)
    private static <T> T call(String operation, String objectPath, Supplier<T> request) {
        try {
            return request.get();
        } catch (RestClientResponseException ex) {
            throw new StorageUnavailableException("Supabase respondió " + ex.getStatusCode().value()
                    + " al " + operation + " " + objectPath, ex);
        } catch (RestClientException ex) {
            throw new StorageUnavailableException("No se pudo contactar a Supabase al " + operation + " "
                    + objectPath + ": " + ex.getClass().getSimpleName(), ex);
        }
    }

    // Respuesta de POST /object/sign/{bucket}/{ruta}
    record SignResponse(String signedURL) {
    }
}
