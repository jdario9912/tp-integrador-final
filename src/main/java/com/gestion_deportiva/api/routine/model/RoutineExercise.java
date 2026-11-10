package com.gestion_deportiva.api.routine.model;

import com.gestion_deportiva.api.exercise.model.Exercise;
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
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.Objects;
import java.util.UUID;

// Ejercicio planificado dentro de un día de la rutina (US-14), con sus parámetros de prescripción.
// El día y la posición los asigna RoutineDay
@Entity
@Table(name = "routine_exercises")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED) // lo exige JPA
public class RoutineExercise {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // Un ejercicio no cambia de día: pasarlo a otro es quitarlo y agregar uno nuevo
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "routine_day_id", nullable = false, updatable = false)
    private RoutineDay routineDay;

    @Setter
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "exercise_id", nullable = false)
    private Exercise exercise;

    @Column(name = "sort_order", nullable = false)
    private short sortOrder;

    @Setter
    @Column(nullable = false)
    private short sets;

    @Setter
    @Column(nullable = false)
    private short reps;

    @Setter
    @Column(name = "recommended_weight_kg", precision = 6, scale = 2)
    private BigDecimal recommendedWeight;

    // Descanso entre series, en segundos
    @Setter
    @Column(name = "rest_seconds")
    private Short rest;

    // "RIR n" o "RPE n"
    @Setter
    @Column(name = "rir_rpe", length = 10)
    private String rirRpe;

    @Setter
    @Column(name = "technique_note", length = 500)
    private String techniqueNote;

    // Builder: exercise, sets y reps son obligatorios; el día y la posición los asigna RoutineDay
    @Builder
    private RoutineExercise(Exercise exercise, short sets, short reps, BigDecimal recommendedWeight, Short rest,
                            String rirRpe, String techniqueNote) {
        this.exercise = Objects.requireNonNull(exercise, "exercise");
        this.sets = sets;
        this.reps = reps;
        this.recommendedWeight = recommendedWeight;
        this.rest = rest;
        this.rirRpe = rirRpe;
        this.techniqueNote = techniqueNote;
    }

    // Copia independiente, sin día asignado (duplicar rutina, US-15)
    RoutineExercise copy() {
        return new RoutineExercise(exercise, sets, reps, recommendedWeight, rest, rirRpe, techniqueNote);
    }

    void moveTo(RoutineDay day, short sortOrder) {
        this.routineDay = Objects.requireNonNull(day, "day");
        this.sortOrder = sortOrder;
    }

    // equals/hashCode por id: patrón seguro para entidades JPA (no usar @Data)
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof RoutineExercise other)) return false;
        return id != null && id.equals(other.getId());
    }

    @Override
    public int hashCode() {
        return RoutineExercise.class.hashCode();
    }
}
