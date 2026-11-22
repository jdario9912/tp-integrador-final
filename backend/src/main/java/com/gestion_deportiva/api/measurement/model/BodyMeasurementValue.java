package com.gestion_deportiva.api.measurement.model;

import com.gestion_deportiva.api.measurement.model.enums.BodyMeasurementType;
import com.gestion_deportiva.api.measurement.model.enums.MeasurementSide;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
import java.util.Objects;
import java.util.UUID;

// Una medida de un registro (US-45): tipo, lado (solo en las bilaterales) y valor. Las reglas del dominio se
// verifican al crearla: el request ya las valida, pero la entidad no depende de que lo haga
@Entity
@Table(name = "body_measurement_values")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED) // lo exige JPA
public class BodyMeasurementValue {

    public static final int VALUE_SCALE = 2;

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "record_id", nullable = false, updatable = false)
    private BodyMeasurementRecord record;

    // Converter autoApply: se guarda el id del catálogo (type_id)
    @Column(name = "type_id", nullable = false, updatable = false)
    private BodyMeasurementType type;

    // null en las medidas que no son bilaterales
    @Enumerated(EnumType.STRING)
    @Column(name = "side", length = 5, updatable = false)
    private MeasurementSide side;

    // numeric(5,2): siempre con escala 2 (80.5 → 80.50), igual que lo devuelve la base
    @Column(name = "value", nullable = false, precision = 5, scale = VALUE_SCALE)
    private BigDecimal value;

    public BodyMeasurementValue(BodyMeasurementRecord record, BodyMeasurementType type, MeasurementSide side,
                                BigDecimal value) {
        this.record = Objects.requireNonNull(record, "record");
        this.type = Objects.requireNonNull(type, "type");
        if (!type.acceptsSide(side)) {
            throw new IllegalArgumentException("side no corresponde a " + type + ": " + side);
        }
        this.side = side;
        this.value = requireValidValue(type, value);
    }

    private static BigDecimal requireValidValue(BodyMeasurementType type, BigDecimal value) {
        Objects.requireNonNull(value, "value");
        if (!type.isWithinRange(value)) {
            throw new IllegalArgumentException(type + " debe estar entre " + type.getMinValue().toPlainString()
                    + " y " + type.getMaxValue().toPlainString() + ": " + value);
        }
        // Sin redondeos silenciosos: numeric(5,2) redondearía 80.555 a 80.56
        if (value.stripTrailingZeros().scale() > VALUE_SCALE) {
            throw new IllegalArgumentException("value admite hasta 2 decimales: " + value);
        }
        return value.setScale(VALUE_SCALE, RoundingMode.UNNECESSARY);
    }

    // equals/hashCode por id: patrón seguro para entidades JPA (no usar @Data)
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof BodyMeasurementValue other)) return false;
        return id != null && id.equals(other.getId());
    }

    @Override
    public int hashCode() {
        return BodyMeasurementValue.class.hashCode();
    }
}
