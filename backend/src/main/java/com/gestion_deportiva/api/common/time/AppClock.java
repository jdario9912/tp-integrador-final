package com.gestion_deportiva.api.common.time;

import com.gestion_deportiva.api.config.TimeZoneProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Objects;

// Fecha y hora de las reglas de negocio (US-18): el instante sale del Clock (UTC) y la fecha, de ese instante en la
// zona de la app (app.time-zone / APP_TIME_ZONE), nunca en UTC: entre las 21:00 y las 23:59 de Argentina, en UTC ya
// es el día siguiente. Lo usan las sesiones de entrenamiento; los services que todavía calculan su propio "hoy"
// (pesos, asignaciones y rutina del atleta) se migran en un refactor aparte (D-020)
@Component
@RequiredArgsConstructor
public class AppClock {

    private final Clock clock;
    private final TimeZoneProperties timeZoneProperties;

    public Instant now() {
        return clock.instant();
    }

    // "Hoy" en la zona de la app
    public LocalDate today() {
        return dateOf(now());
    }

    // Fecha de un instante en la zona de la app. Para guardar un instante y su fecha juntos, calcular la fecha a
    // partir del mismo now() y no llamar a today() por separado (a medianoche podrían quedar en días distintos)
    public LocalDate dateOf(Instant instant) {
        return LocalDate.ofInstant(Objects.requireNonNull(instant, "instant"), timeZoneProperties.zoneId());
    }
}
