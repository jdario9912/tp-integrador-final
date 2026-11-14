package com.gestion_deportiva.api.training.model;

import com.gestion_deportiva.api.routine.model.RoutineExercise;
import com.gestion_deportiva.api.training.model.enums.SetStatus;
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
import java.util.Objects;
import java.util.UUID;

// Serie registrada en vivo (US-19): la serie número N de un ejercicio del día de una sesión, realizada (DONE, con peso
// y repeticiones) u omitida (SKIPPED, con motivo). Una serie por (sesión, ejercicio, número) (V11). Registrarla de
// nuevo la reemplaza entera: así corregir y reintentar tras un corte de red no duplica nada
@Entity
@Table(name = "performed_sets")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED) // lo exige JPA
public class PerformedSet {

    static final int SKIP_REASON_MAX_LENGTH = 200;
    static final int REPS_MIN = 1;
    static final int REPS_MAX = 999;
    static final int RPE_MIN = 1;
    static final int RPE_MAX = 10;

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // Una serie no cambia de sesión ni de ejercicio: la clave es la que la identifica
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "training_session_id", nullable = false, updatable = false)
    private TrainingSession trainingSession;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "routine_exercise_id", nullable = false, updatable = false)
    private RoutineExercise routineExercise;

    @Column(name = "set_number", nullable = false, updatable = false)
    private short setNumber;

    // Se guarda como id (smallint) gracias a SetStatusConverter (autoApply)
    @Column(name = "status_id", nullable = false)
    private SetStatus status;

    // Kilos con dos decimales. null si la serie se omitió
    @Column(name = "weight_kg", precision = 6, scale = 2)
    private BigDecimal weightKg;

    // null si la serie se omitió
    @Column
    private Short reps;

    // Esfuerzo percibido, opcional. null si no se cargó o si la serie se omitió
    @Column
    private Short rpe;

    // Motivo de la omisión. null si la serie se realizó
    @Column(name = "skip_reason", length = SKIP_REASON_MAX_LENGTH)
    private String skipReason;

    // Nace sin datos: quien la crea la completa con markDone o markSkipped
    public PerformedSet(TrainingSession trainingSession, RoutineExercise routineExercise, short setNumber) {
        this.trainingSession = Objects.requireNonNull(trainingSession, "trainingSession");
        this.routineExercise = Objects.requireNonNull(routineExercise, "routineExercise");
        if (setNumber < 1) {
            throw new IllegalArgumentException("La serie empieza en 1");
        }
        this.setNumber = setNumber;
    }

    // Serie realizada: reemplaza todo lo anterior (un motivo de omisión previo se borra). El RPE es opcional y, si no
    // viene, queda en null. La validación de rango de la request la hace antes el DTO; acá se reconfirma
    public void markDone(BigDecimal weight, int reps, Integer rpe) {
        Objects.requireNonNull(weight, "weight");
        if (weight.signum() < 0) {
            throw new IllegalArgumentException("El peso no puede ser negativo");
        }
        if (reps < REPS_MIN || reps > REPS_MAX) {
            throw new IllegalArgumentException("Las repeticiones deben estar entre 1 y 999");
        }
        if (rpe != null && (rpe < RPE_MIN || rpe > RPE_MAX)) {
            throw new IllegalArgumentException("El RPE debe estar entre 1 y 10");
        }
        this.status = SetStatus.DONE;
        this.weightKg = weight.setScale(2);
        this.reps = (short) reps;
        this.rpe = rpe == null ? null : rpe.shortValue();
        this.skipReason = null;
    }

    // Serie omitida con motivo: peso, repeticiones y RPE se descartan (quedan en null). El motivo se guarda sin espacios
    // al principio ni al final
    public void markSkipped(String reason) {
        String trimmed = Objects.requireNonNull(reason, "reason").strip();
        if (trimmed.isEmpty()) {
            throw new IllegalArgumentException("Ingresá el motivo de una serie omitida");
        }
        if (trimmed.length() > SKIP_REASON_MAX_LENGTH) {
            throw new IllegalArgumentException("El motivo no puede superar los 200 caracteres");
        }
        this.status = SetStatus.SKIPPED;
        this.weightKg = null;
        this.reps = null;
        this.rpe = null;
        this.skipReason = trimmed;
    }

    // equals/hashCode por id: patrón seguro para entidades JPA (no usar @Data)
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof PerformedSet other)) return false;
        return id != null && id.equals(other.getId());
    }

    @Override
    public int hashCode() {
        return PerformedSet.class.hashCode();
    }
}
