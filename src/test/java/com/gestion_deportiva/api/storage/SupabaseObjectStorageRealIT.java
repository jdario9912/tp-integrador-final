package com.gestion_deportiva.api.storage;

import com.gestion_deportiva.api.config.StorageProperties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.web.client.RestClient;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Clock;
import java.time.Duration;
import java.util.Base64;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

// Prueba contra el Supabase real (US-37, CA-1, CA-2, CE-1, CE-2). Sin Spring ni Docker.
// Solo corre si están SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y SUPABASE_STORAGE_BUCKET en el entorno;
// si falta SUPABASE_URL, JUnit la saltea. Sube un PNG a poc/<uuid>.png y lo borra al final.
@EnabledIfEnvironmentVariable(named = "SUPABASE_URL", matches = ".+")
class SupabaseObjectStorageRealIT {

    // PNG de 1x1 píxel
    private static final byte[] PNG = Base64.getDecoder().decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==");
    private static final Duration SHORT_TTL = Duration.ofSeconds(3);

    private final HttpClient http = HttpClient.newHttpClient();

    @Test
    void signedUrlWorksBeforeExpiringAndTheObjectIsNotReachableWithoutSignature() throws Exception {
        StorageProperties properties = new StorageProperties(System.getenv("SUPABASE_URL"),
                System.getenv("SUPABASE_SERVICE_ROLE_KEY"), System.getenv("SUPABASE_STORAGE_BUCKET"),
                Duration.ofMinutes(10));
        ObjectStorage storage = new SupabaseObjectStorage(properties, RestClient.builder(), Clock.systemUTC());
        String path = "poc/" + UUID.randomUUID() + ".png";

        storage.upload(path, PNG, "image/png");
        try {
            // CA-1 / CA-2: la URL firmada funciona antes de vencer
            SignedUrl signedUrl = storage.createSignedUrl(path, SHORT_TTL);
            HttpResponse<byte[]> beforeExpiring = get(signedUrl.url());
            assertThat(beforeExpiring.statusCode()).isEqualTo(200);
            assertThat(beforeExpiring.body()).isEqualTo(PNG);

            // CE-1: sin firma, ni por la ruta pública ni por la autenticada sin token
            String storageUrl = properties.url() + SupabaseObjectStorage.STORAGE_PATH;
            assertThat(get(storageUrl + "/object/public/" + properties.bucket() + "/" + path).statusCode())
                    .isNotEqualTo(200);
            assertThat(get(storageUrl + "/object/" + properties.bucket() + "/" + path).statusCode())
                    .isNotEqualTo(200);

            // CA-2 / CE-2: después de vencer, la misma URL da error (Supabase responde 400 "exp" claim)
            Thread.sleep(SHORT_TTL.plusSeconds(2).toMillis());
            assertThat(get(signedUrl.url()).statusCode()).isGreaterThanOrEqualTo(400);
        } finally {
            storage.delete(path);
        }
    }

    private HttpResponse<byte[]> get(String url) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofSeconds(15)).GET().build();
        return http.send(request, HttpResponse.BodyHandlers.ofByteArray());
    }
}
