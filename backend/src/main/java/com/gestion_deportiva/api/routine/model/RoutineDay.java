package com.gestion_deportiva.api.routine.model;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

// Día de una rutina (US-14). El orden dentro de la rutina lo da dayNumber y lo administra Routine
@Entity
@Table(name = "routine_days")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED) // lo exige JPA
public class RoutineDay {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // Un día no cambia de rutina
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "routine_id", nullable = false, updatable = false)
    private Routine routine;

    @Column(name = "day_number", nullable = false)
    private short dayNumber;

    // Siempre sin espacios al principio ni al final
    @Column(nullable = false, length = 100)
    private String name;

    // orphanRemoval: un ejercicio que sale de la lista se borra
    @OneToMany(mappedBy = "routineDay", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder")
    private List<RoutineExercise> exercises = new ArrayList<>();

    // Lo crea Routine.addDay, que le asigna el número
    RoutineDay(Routine routine, String name, short dayNumber) {
        this.routine = Objects.requireNonNull(routine, "routine");
        rename(name);
        this.dayNumber = dayNumber;
    }

    public void rename(String newName) {
        this.name = Objects.requireNonNull(newName, "name").trim();
    }

    // Agrega el ejercicio al final del día
    public void addExercise(RoutineExercise exercise) {
        exercise.moveTo(this, (short) exercises.size());
        exercises.add(exercise);
    }

    // Deja exactamente estos ejercicios y en este orden: los que no están se borran (orphanRemoval).
    // Los existentes tienen que ser de este día: mover un hijo entre colecciones con orphanRemoval no es portable
    public void replaceExercises(List<RoutineExercise> ordered) {
        exercises.removeIf(exercise -> !ordered.contains(exercise));
        for (int i = 0; i < ordered.size(); i++) {
            RoutineExercise exercise = ordered.get(i);
            if (exercise.getRoutineDay() != null && !this.equals(exercise.getRoutineDay())) {
                throw new IllegalArgumentException("El ejercicio pertenece a otro día");
            }
            exercise.moveTo(this, (short) i);
            if (!exercises.contains(exercise)) {
                exercises.add(exercise);
            }
        }
        exercises.sort(Comparator.comparingInt(RoutineExercise::getSortOrder));
    }

    public List<RoutineExercise> getExercises() {
        return Collections.unmodifiableList(exercises);
    }

    void setDayNumber(short dayNumber) {
        this.dayNumber = dayNumber;
    }

    // equals/hashCode por id: patrón seguro para entidades JPA (no usar @Data)
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof RoutineDay other)) return false;
        return id != null && id.equals(other.getId());
    }

    @Override
    public int hashCode() {
        return RoutineDay.class.hashCode();
    }
}
