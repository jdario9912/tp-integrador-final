package com.gestion_deportiva.api.measurement.model;

import com.gestion_deportiva.api.athlete.model.Athlete;
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
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Objects;
import java.util.UUID;

// Registro de medidas corporales del atleta (US-45): uno por día (índice único de la V20), con sus medidas en
// BodyMeasurementValue. No se borra: se corrige. Como en el peso (US-26), los timestamps los fija el service con su
// Clock y se truncan a microsegundos, la precisión de timestamptz
@Entity
@Table(name = "body_measurement_records")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED) // lo exige JPA
public class BodyMeasurementRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // El dueño no cambia después del alta
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "athlete_id", nullable = false, updatable = false)
    private Athlete athlete;

    // El "date" de la API
    @Column(name = "measured_on", nullable = false)
    private LocalDate measuredOn;

    // Sin espacios en los extremos; null si no hay (nunca "", ver ck_body_measurement_records_comment)
    @Column(length = 500)
    private String comment;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public BodyMeasurementRecord(Athlete athlete, LocalDate measuredOn, String comment, Instant createdAt) {
        this.athlete = Objects.requireNonNull(athlete, "athlete");
        changeData(measuredOn, comment);
        this.createdAt = toDatabasePrecision(createdAt, "createdAt");
        this.updatedAt = this.createdAt;
    }

    // Edición de la fecha y el comentario. Las medidas se reemplazan aparte, por sus propias filas (en el service)
    public void correct(LocalDate newMeasuredOn, String newComment, Instant correctedAt) {
        changeData(newMeasuredOn, newComment);
        this.updatedAt = toDatabasePrecision(correctedAt, "correctedAt");
    }

    private void changeData(LocalDate newMeasuredOn, String newComment) {
        this.measuredOn = Objects.requireNonNull(newMeasuredOn, "measuredOn");
        this.comment = blankToNull(newComment);
    }

    private static String blankToNull(String text) {
        return text == null || text.isBlank() ? null : text.trim();
    }

    // timestamptz guarda microsegundos: con la misma precisión, la respuesta del alta coincide con la del listado
    private static Instant toDatabasePrecision(Instant instant, String name) {
        return Objects.requireNonNull(instant, name).truncatedTo(ChronoUnit.MICROS);
    }

    // equals/hashCode por id: patrón seguro para entidades JPA (no usar @Data)
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof BodyMeasurementRecord other)) return false;
        return id != null && id.equals(other.getId());
    }

    @Override
    public int hashCode() {
        return BodyMeasurementRecord.class.hashCode();
    }
}
