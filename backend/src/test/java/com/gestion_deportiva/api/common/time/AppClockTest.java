package com.gestion_deportiva.api.common.time;

import com.gestion_deportiva.api.config.TimeZoneProperties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

// El reloj es UTC y la fecha se calcula en la zona de la app: Argentina (UTC-3) por defecto
class AppClockTest {

    @Test
    void shouldReturnTheInstantOfTheClock() {
        Instant now = Instant.parse("2026-11-11T22:15:03.512345Z");

        assertEquals(now, appClock(now, TimeZoneProperties.DEFAULT_TIME_ZONE).now());
    }

    // Borde de medianoche: hasta las 02:59:59 UTC sigue siendo el día anterior en Argentina
    @ParameterizedTest(name = "a las {0} hoy es {1}")
    @CsvSource({
            "2026-11-11T15:00:00Z, 2026-11-11",
            "2026-11-12T01:30:00Z, 2026-11-11",
            "2026-11-12T02:59:59Z, 2026-11-11",
            "2026-11-12T03:00:00Z, 2026-11-12"
    })
    void shouldCalculateTodayInTheAppTimeZone(Instant now, LocalDate expectedToday) {
        assertEquals(expectedToday, appClock(now, TimeZoneProperties.DEFAULT_TIME_ZONE).today());
    }

    @Test
    void shouldUseTheConfiguredZone() {
        Instant now = Instant.parse("2026-11-12T01:30:00Z");

        assertEquals(LocalDate.of(2026, 11, 12), appClock(now, "UTC").today());
        assertEquals(LocalDate.of(2026, 11, 11), appClock(now, "America/Argentina/Buenos_Aires").today());
    }

    @Test
    void shouldCalculateTheDateOfAnyInstantInTheAppTimeZone() {
        // Arrange: el reloj no interviene
        AppClock clock = appClock(Instant.parse("2030-01-01T12:00:00Z"), TimeZoneProperties.DEFAULT_TIME_ZONE);

        // Act + Assert
        assertEquals(LocalDate.of(2026, 12, 28), clock.dateOf(Instant.parse("2026-12-29T02:30:00Z")));
        assertEquals(LocalDate.of(2026, 12, 29), clock.dateOf(Instant.parse("2026-12-29T03:00:00Z")));
        assertThrows(NullPointerException.class, () -> clock.dateOf(null));
    }

    private static AppClock appClock(Instant now, String timeZone) {
        return new AppClock(Clock.fixed(now, ZoneOffset.UTC), new TimeZoneProperties(timeZone));
    }
}
