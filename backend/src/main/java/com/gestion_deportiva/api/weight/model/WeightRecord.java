package com.gestion_deportiva.api.weight.model;

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

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Objects;
import java.util.UUID;

// Registro de peso corporal del atleta (US-26): uno por día (índice único de la V6). No se borra: se corrige.
// Los timestamps los fija quien crea o corrige el registro (el service, con su Clock) y no @CreationTimestamp /
// @UpdateTimestamp: así un registro sin editar tiene updatedAt igual a createdAt y cada corrección lo actualiza
// aunque los datos no cambien (contrato 8.2)
@Entity
@Table(name = "weight_records")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED) // lo exige JPA
public class WeightRecord {

    // Mismos límites que el CHECK de la base y la validación del request: de 20 a 300 kg, hasta 2 decimales
    public static final BigDecimal MIN_WEIGHT_KG = new BigDecimal("20");
    public static final BigDecimal MAX_WEIGHT_KG = new BigDecimal("300");
    public static final int WEIGHT_SCALE = 2;

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // El dueño no cambia después del alta
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "athlete_id", nullable = false, updatable = false)
    private Athlete athlete;

    // El "date" de la API
    @Column(name = "recorded_on", nullable = false)
    private LocalDate recordedOn;

    // Siempre con escala 2 (72.5 → 72.50), igual que lo devuelve la base: el alta y el listado responden lo mismo
    @Column(name = "weight_kg", nullable = false, precision = 5, scale = 2)
    private BigDecimal weightKg;

    // Sin espacios en los extremos; null si no hay (nunca "", ver ck_weight_records_comment)
    @Column(length = 500)
    private String comment;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public WeightRecord(Athlete athlete, LocalDate recordedOn, BigDecimal weightKg, String comment,
                        Instant createdAt) {
        this.athlete = Objects.requireNonNull(athlete, "athlete");
        changeData(recordedOn, weightKg, comment);
        this.createdAt = toDatabasePrecision(createdAt, "createdAt");
        this.updatedAt = this.createdAt;
    }

    // Edición completa (PUT): reemplaza fecha, peso y comentario (el que no viene queda en null)
    public void correct(LocalDate newRecordedOn, BigDecimal newWeightKg, String newComment, Instant correctedAt) {
        changeData(newRecordedOn, newWeightKg, newComment);
        this.updatedAt = toDatabasePrecision(correctedAt, "correctedAt");
    }

    private void changeData(LocalDate newRecordedOn, BigDecimal newWeightKg, String newComment) {
        this.recordedOn = Objects.requireNonNull(newRecordedOn, "recordedOn");
        this.weightKg = requireValidWeight(newWeightKg);
        this.comment = blankToNull(newComment);
    }

    private static BigDecimal requireValidWeight(BigDecimal weightKg) {
        Objects.requireNonNull(weightKg, "weightKg");
        if (weightKg.compareTo(MIN_WEIGHT_KG) < 0 || weightKg.compareTo(MAX_WEIGHT_KG) > 0) {
            throw new IllegalArgumentException("weightKg debe estar entre 20 y 300: " + weightKg);
        }
        // Sin redondeos silenciosos: numeric(5,2) redondearía 72.555 a 72.56
        if (weightKg.stripTrailingZeros().scale() > WEIGHT_SCALE) {
            throw new IllegalArgumentException("weightKg admite hasta 2 decimales: " + weightKg);
        }
        return weightKg.setScale(WEIGHT_SCALE, RoundingMode.UNNECESSARY);
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
        if (!(o instanceof WeightRecord other)) return false;
        return id != null && id.equals(other.getId());
    }

    @Override
    public int hashCode() {
        return WeightRecord.class.hashCode();
    }
}
