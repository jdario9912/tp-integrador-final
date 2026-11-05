package com.gestion_deportiva.api.config;

import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class StoragePropertiesTest {

    private static final String URL = "https://proyecto.supabase.co";
    private static final String KEY = "service-role-key-de-prueba";
    private static final Duration TTL = Duration.ofMinutes(10);

    @Test
    void shouldBeConfiguredWhenUrlKeyAndBucketArePresent() {
        assertThat(new StorageProperties(URL, KEY, "progress-photos", TTL).isConfigured()).isTrue();
    }

    @Test
    void shouldTreatBlankValuesAsMissingSoTheAppStartsWithoutStorage() {
        StorageProperties properties = new StorageProperties("", " ", null, TTL);

        assertThat(properties.isConfigured()).isFalse();
        assertThat(properties.url()).isNull();
        assertThat(properties.serviceRoleKey()).isNull();
    }

    @Test
    void shouldNotBeConfiguredIfAnyCredentialIsMissing() {
        assertThat(new StorageProperties(URL, KEY, null, TTL).isConfigured()).isFalse();
        assertThat(new StorageProperties(URL, null, "bucket", TTL).isConfigured()).isFalse();
        assertThat(new StorageProperties(null, KEY, "bucket", TTL).isConfigured()).isFalse();
    }

    @Test
    void shouldRemoveTheTrailingSlashFromTheUrl() {
        assertThat(new StorageProperties(URL + "/", KEY, "bucket", TTL).url()).isEqualTo(URL);
    }

    @Test
    void shouldRejectAUrlWithPath() {
        assertThatThrownBy(() -> new StorageProperties(URL + "/storage/v1", KEY, "bucket", TTL))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("SUPABASE_URL");
    }

    @Test
    void shouldRejectATtlShorterThanOneSecond() {
        assertThatThrownBy(() -> new StorageProperties(URL, KEY, "bucket", Duration.ZERO))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("STORAGE_SIGNED_URL_TTL");
        assertThatThrownBy(() -> new StorageProperties(URL, KEY, "bucket", Duration.ofMillis(500)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void toStringShouldNotExposeTheServiceRoleKey() {
        assertThat(new StorageProperties(URL, KEY, "bucket", TTL).toString())
                .doesNotContain(KEY)
                .contains("***");
    }
}
