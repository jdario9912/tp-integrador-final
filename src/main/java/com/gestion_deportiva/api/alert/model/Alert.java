package com.gestion_deportiva.api.alert.model;

import com.gestion_deportiva.api.alert.model.enums.AlertSeverity;
import com.gestion_deportiva.api.alert.model.enums.AlertType;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.coach.model.Coach;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Objects;
import java.util.UUID;

// Alerta automática sobre un atleta (US-47, COM-02/COM-03). Abierta mientras handledAt es null; una sola abierta por
// atleta y tipo (ux_alerts_athlete_type_open de la V18). Atenderla guarda quién y cuándo
@Entity
@Table(name = "alerts")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED) // lo exige JPA
public class Alert {

    public static final int MAX_MESSAGE_LENGTH = 255;

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "athlete_id", nullable = false, updatable = false)
    private Athlete athlete;

    @Column(name = "alert_type_id", nullable = false, updatable = false)
    private AlertType type;

    @Column(nullable = false, length = MAX_MESSAGE_LENGTH, updatable = false)
    private String message;

    @Column(name = "generated_at", nullable = false, updatable = false)
    private Instant generatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "handled_by")
    private Coach handledBy;

    @Column(name = "handled_at")
    private Instant handledAt;

    public Alert(Athlete athlete, AlertType type, String message, Instant generatedAt) {
        this.athlete = Objects.requireNonNull(athlete, "athlete");
        this.type = Objects.requireNonNull(type, "type");
        this.message = requireMessage(message);
        this.generatedAt = toDatabasePrecision(generatedAt, "generatedAt");
    }

    // Quien llama comprueba antes que no esté atendida (409): acá es una invariante
    public void handle(Coach coach, Instant at) {
        if (isHandled()) {
            throw new IllegalStateException("La alerta ya fue atendida");
        }
        Instant handledInstant = toDatabasePrecision(at, "handledAt");
        if (handledInstant.isBefore(generatedAt)) {
            throw new IllegalArgumentException("handledAt no puede ser anterior a generatedAt");
        }
        this.handledBy = Objects.requireNonNull(coach, "coach");
        this.handledAt = handledInstant;
    }

    public boolean isHandled() {
        return handledAt != null;
    }

    public AlertSeverity getSeverity() {
        return type.getSeverity();
    }

    private static String requireMessage(String message) {
        Objects.requireNonNull(message, "message");
        String trimmed = message.trim();
        if (trimmed.isEmpty() || trimmed.length() > MAX_MESSAGE_LENGTH) {
            throw new IllegalArgumentException("message debe tener entre 1 y " + MAX_MESSAGE_LENGTH + " caracteres");
        }
        return trimmed;
    }

    // timestamptz guarda microsegundos: con la misma precisión, la respuesta coincide con lo guardado
    private static Instant toDatabasePrecision(Instant instant, String name) {
        return Objects.requireNonNull(instant, name).truncatedTo(ChronoUnit.MICROS);
    }

    // equals/hashCode por id: patrón seguro para entidades JPA (no usar @Data)
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Alert other)) return false;
        return id != null && id.equals(other.getId());
    }

    @Override
    public int hashCode() {
        return Alert.class.hashCode();
    }
}
