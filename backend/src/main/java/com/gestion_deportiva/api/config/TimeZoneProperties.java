package com.gestion_deportiva.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.DateTimeException;
import java.time.ZoneId;

// Zona horaria de la app (app.time-zone, US-26): define qué fecha es "hoy" para las reglas de negocio (por ahora,
// la fecha no futura de los registros de peso). Los instantes siguen en UTC (el Clock de ClockConfig).
// Vacía usa el valor por defecto (con el .env importado, una variable vacía llega como ""); inválida hace fallar
// el arranque con un mensaje que nombra la variable
@ConfigurationProperties(prefix = "app")
public record TimeZoneProperties(String timeZone) {

    // ID IANA y no un offset fijo (-03:00): sigue funcionando si Argentina vuelve a tener horario de verano
    public static final String DEFAULT_TIME_ZONE = "America/Argentina/Buenos_Aires";

    public TimeZoneProperties {
        timeZone = timeZone == null || timeZone.isBlank() ? DEFAULT_TIME_ZONE : timeZone.trim();
        try {
            ZoneId.of(timeZone);
        } catch (DateTimeException ex) {
            throw new IllegalArgumentException("app.time-zone (APP_TIME_ZONE) es inválida: '" + timeZone
                    + "'. Usar un ID IANA (ej. " + DEFAULT_TIME_ZONE + ")", ex);
        }
    }

    public ZoneId zoneId() {
        return ZoneId.of(timeZone);
    }
}
