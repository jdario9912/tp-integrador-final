package com.gestion_deportiva.api.storage;

import com.gestion_deportiva.api.config.StorageProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.net.ConnectException;
import java.net.SocketTimeoutException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

// Prueba el adaptador contra un Supabase simulado: rutas, cabeceras, armado de la URL firmada y fallos
class SupabaseObjectStorageTest {

    private static final String URL = "https://proyecto.supabase.co";
    private static final String KEY = "service-role-key-de-prueba";
    private static final String BUCKET = "progress-photos";
    private static final String PATH = "poc/foto.png";
    private static final String STORAGE = URL + "/storage/v1";
    private static final Instant NOW = Instant.parse("2026-11-01T12:00:00Z");

    private MockRestServiceServer server;
    private SupabaseObjectStorage storage;

    @BeforeEach
    void setUp() {
        storage = storageWith(new StorageProperties(URL, KEY, BUCKET, Duration.ofMinutes(10)));
    }

    private SupabaseObjectStorage storageWith(StorageProperties properties) {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        return new SupabaseObjectStorage(properties, builder, Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @Test
    void uploadPostsTheContentToTheBucketPathWithTheServiceRoleKey() {
        byte[] content = {1, 2, 3};
        server.expect(requestTo(STORAGE + "/object/" + BUCKET + "/" + PATH))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer " + KEY))
                .andExpect(header("apikey", KEY))
                .andExpect(header("Content-Type", "image/png"))
                .andExpect(header("x-upsert", "false"))
                .andExpect(content().bytes(content))
                .andRespond(withSuccess("{\"Key\":\"" + BUCKET + "/" + PATH + "\"}", MediaType.APPLICATION_JSON));

        storage.upload(PATH, content, "image/png");

        server.verify();
    }

    @Test
    void createSignedUrlBuildsTheFullUrlAndTheExpirationFromTheRequestedTtl() {
        server.expect(requestTo(STORAGE + "/object/sign/" + BUCKET + "/" + PATH))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer " + KEY))
                .andExpect(content().json("{\"expiresIn\": 60}"))
                .andRespond(withSuccess("{\"signedURL\":\"/object/sign/" + BUCKET + "/" + PATH + "?token=abc\"}",
                        MediaType.APPLICATION_JSON));

        SignedUrl signedUrl = storage.createSignedUrl(PATH, Duration.ofSeconds(60));

        assertThat(signedUrl.url()).isEqualTo(STORAGE + "/object/sign/" + BUCKET + "/" + PATH + "?token=abc");
        assertThat(signedUrl.expiresAt()).isEqualTo(NOW.plusSeconds(60));
        server.verify();
    }

    @Test
    void createSignedUrlUsesTheConfiguredTtlByDefault() {
        server.expect(requestTo(STORAGE + "/object/sign/" + BUCKET + "/" + PATH))
                .andExpect(content().json("{\"expiresIn\": 600}"))
                .andRespond(withSuccess("{\"signedURL\":\"/object/sign/x?token=t\"}", MediaType.APPLICATION_JSON));

        assertThat(storage.createSignedUrl(PATH).expiresAt()).isEqualTo(NOW.plus(Duration.ofMinutes(10)));
    }

    @Test
    void createSignedUrlFailsIfSupabaseDoesNotReturnTheUrl() {
        server.expect(requestTo(STORAGE + "/object/sign/" + BUCKET + "/" + PATH))
                .andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> storage.createSignedUrl(PATH)).isInstanceOf(StorageUnavailableException.class);
    }

    @Test
    void deleteRemovesTheObjectByPrefix() {
        server.expect(requestTo(STORAGE + "/object/" + BUCKET))
                .andExpect(method(HttpMethod.DELETE))
                .andExpect(header("apikey", KEY))
                .andExpect(content().json("{\"prefixes\": [\"" + PATH + "\"]}"))
                .andRespond(withSuccess("[]", MediaType.APPLICATION_JSON));

        storage.delete(PATH);

        server.verify();
    }

    @Test
    void serverErrorIsTranslatedWithoutExposingTheKey() {
        server.expect(requestTo(STORAGE + "/object/" + BUCKET + "/" + PATH)).andRespond(withServerError());

        assertThatThrownBy(() -> storage.upload(PATH, new byte[]{1}, "image/png"))
                .isInstanceOf(StorageUnavailableException.class)
                .hasMessageContaining("500")
                .message().doesNotContain(KEY);
    }

    @Test
    void clientErrorIsAlsoTranslated() {
        server.expect(requestTo(STORAGE + "/object/sign/" + BUCKET + "/" + PATH))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST)
                        .body("{\"error\":\"not_found\",\"message\":\"Object not found\"}")
                        .contentType(MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> storage.createSignedUrl(PATH))
                .isInstanceOf(StorageUnavailableException.class)
                .hasMessageContaining("400");
    }

    @Test
    void timeoutIsTranslated() {
        server.expect(requestTo(STORAGE + "/object/sign/" + BUCKET + "/" + PATH))
                .andRespond(withException(new SocketTimeoutException("Read timed out")));

        assertThatThrownBy(() -> storage.createSignedUrl(PATH))
                .isInstanceOf(StorageUnavailableException.class)
                .message().doesNotContain(KEY);
    }

    @Test
    void refusedConnectionIsTranslated() {
        server.expect(requestTo(STORAGE + "/object/" + BUCKET))
                .andRespond(withException(new ConnectException("Connection refused")));

        assertThatThrownBy(() -> storage.delete(PATH)).isInstanceOf(StorageUnavailableException.class);
    }

    @Test
    void missingConfigurationFailsWithoutCallingSupabase() {
        SupabaseObjectStorage unconfigured = storageWith(new StorageProperties(null, null, null, Duration.ofMinutes(10)));

        assertThatThrownBy(() -> unconfigured.upload(PATH, new byte[]{1}, "image/png"))
                .isInstanceOf(StorageUnavailableException.class)
                .hasMessageContaining("no está configurado");
        assertThatThrownBy(() -> unconfigured.createSignedUrl(PATH)).isInstanceOf(StorageUnavailableException.class);
        assertThatThrownBy(() -> unconfigured.delete(PATH)).isInstanceOf(StorageUnavailableException.class);
        server.verify();
    }

    @Test
    void invalidObjectPathsAreRejected() {
        assertThatThrownBy(() -> storage.createSignedUrl("../otro-bucket/foto.png"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> storage.upload("/foto.png", new byte[]{1}, "image/png"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> storage.delete("fotos/con espacio.png"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void ttlShorterThanOneSecondIsRejected() {
        assertThatThrownBy(() -> storage.createSignedUrl(PATH, Duration.ofMillis(10)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    // US-28 (bloque propio): firma en lote con POST /object/sign/{bucket} y {expiresIn, paths}
    @Test
    void batchSignsEveryPathInOneRequestAndKeepsTheOrderOfTheList() {
        server.expect(requestTo(STORAGE + "/object/sign/" + BUCKET))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer " + KEY))
                .andExpect(content().json("{\"expiresIn\": 600, \"paths\": [\"poc/a.jpg\", \"poc/b.jpg\"]}"))
                // Supabase devuelve las entradas en otro orden: se empareja por "path"
                .andRespond(withSuccess("[{\"error\":null,\"path\":\"poc/b.jpg\",\"signedURL\":\"/object/sign/"
                        + BUCKET + "/poc/b.jpg?token=bbb\"},{\"error\":null,\"path\":\"poc/a.jpg\",\"signedURL\":\"/object/sign/"
                        + BUCKET + "/poc/a.jpg?token=aaa\"}]", MediaType.APPLICATION_JSON));

        List<SignedUrl> urls = storage.createSignedUrls(List.of("poc/a.jpg", "poc/b.jpg"));

        assertThat(urls).extracting(SignedUrl::url).containsExactly(
                STORAGE + "/object/sign/" + BUCKET + "/poc/a.jpg?token=aaa",
                STORAGE + "/object/sign/" + BUCKET + "/poc/b.jpg?token=bbb");
        assertThat(urls).extracting(SignedUrl::expiresAt).containsOnly(NOW.plus(Duration.ofMinutes(10)));
        server.verify();
    }

    @Test
    void batchUsesTheConfiguredTtlAndTheExplicitOneWhenGiven() {
        server.expect(requestTo(STORAGE + "/object/sign/" + BUCKET))
                .andExpect(content().json("{\"expiresIn\": 600}"))
                .andRespond(withSuccess("[{\"path\":\"poc/a.jpg\",\"signedURL\":\"/object/sign/x?token=t\"}]",
                        MediaType.APPLICATION_JSON));

        assertThat(storage.createSignedUrls(List.of("poc/a.jpg")).get(0).expiresAt())
                .isEqualTo(NOW.plus(Duration.ofMinutes(10)));
    }

    @Test
    void batchOfNothingDoesNotCallSupabase() {
        assertThat(storage.createSignedUrls(List.of())).isEmpty();

        server.verify();
    }

    @Test
    void batchFailsIfSupabaseOmitsOneOfThePaths() {
        server.expect(requestTo(STORAGE + "/object/sign/" + BUCKET))
                .andRespond(withSuccess("[{\"error\":\"Object not found\",\"path\":\"poc/a.jpg\",\"signedURL\":null}]",
                        MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> storage.createSignedUrls(List.of("poc/a.jpg", "poc/b.jpg")))
                .isInstanceOf(StorageUnavailableException.class)
                .hasMessageContaining("poc/a.jpg");
    }

    @Test
    void batchTranslatesAServerErrorWithoutExposingTheKey() {
        server.expect(requestTo(STORAGE + "/object/sign/" + BUCKET)).andRespond(withServerError());

        assertThatThrownBy(() -> storage.createSignedUrls(List.of(PATH)))
                .isInstanceOf(StorageUnavailableException.class)
                .message().doesNotContain(KEY);
    }

    @Test
    void batchRejectsInvalidPathsBeforeCallingSupabase() {
        assertThatThrownBy(() -> storage.createSignedUrls(List.of("../otro/foto.jpg")))
                .isInstanceOf(IllegalArgumentException.class);
        server.verify();
    }
}
