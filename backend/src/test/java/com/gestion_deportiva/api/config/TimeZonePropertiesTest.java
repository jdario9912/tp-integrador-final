package com.gestion_deportiva.api.config;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

import java.time.ZoneId;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Una zona inválida hace fallar el arranque; una vacía (variable vacía en .env) usa la de Argentina
class TimeZonePropertiesTest {

    @Test
    void shouldUseTheConfiguredZone() {
        TimeZoneProperties properties = new TimeZoneProperties("Europe/Madrid");

        assertEquals("Europe/Madrid", properties.timeZone());
        assertEquals(ZoneId.of("Europe/Madrid"), properties.zoneId());
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", " ", "   "})
    void shouldUseArgentinaWhenMissingOrBlank(String timeZone) {
        TimeZoneProperties properties = new TimeZoneProperties(timeZone);

        assertEquals(TimeZoneProperties.DEFAULT_TIME_ZONE, properties.timeZone());
        assertEquals(ZoneId.of("America/Argentina/Buenos_Aires"), properties.zoneId());
    }

    @Test
    void shouldTrimTheZone() {
        assertEquals("UTC", new TimeZoneProperties("  UTC ").timeZone());
    }

    @ParameterizedTest
    @ValueSource(strings = {"Argentina", "America/Buenos Aires", "GMT-99"})
    void shouldRejectAnInvalidZoneNamingTheVariable(String timeZone) {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> new TimeZoneProperties(timeZone));

        assertTrue(ex.getMessage().contains("APP_TIME_ZONE"));
    }
}
