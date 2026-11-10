package com.gestion_deportiva.api.routine.model;

import com.gestion_deportiva.api.coach.model.Coach;
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
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

// Rutina de entrenamiento del entrenador (US-13). Sus días y ejercicios se configuran en US-14
@Entity
@Table(name = "routines")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED) // lo exige JPA
public class Routine {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // La autoría no cambia después del alta
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "coach_id", nullable = false, updatable = false)
    private Coach coach;

    // Siempre sin espacios al principio ni al final: la unicidad compara lower(name)
    @Column(nullable = false, length = 100)
    private String name;

    @Setter
    @Column(length = 500)
    private String description;

    @Setter
    @Column(length = 100)
    private String goal;

    @Setter
    @Column(name = "days_per_week")
    private Short daysPerWeek;

    @Setter
    @Column(name = "duration_weeks")
    private Short durationWeeks;

    // Plantilla reutilizable para distintos atletas
    @Setter
    @Column(name = "is_template", nullable = false)
    private boolean template;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    // orphanRemoval: un día que sale de la lista se borra junto con sus ejercicios
    @OneToMany(mappedBy = "routine", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("dayNumber")
    private List<RoutineDay> days = new ArrayList<>();

    public Routine(String name, Coach coach) {
        rename(name);
        this.coach = Objects.requireNonNull(coach, "coach");
    }

    // Builder sobre el constructor: name y coach siguen siendo obligatorios (el nombre se normaliza)
    // y el id y los timestamps no se exponen
    @Builder
    private Routine(String name, Coach coach, String description, String goal, Short daysPerWeek,
                    Short durationWeeks, boolean template) {
        this(name, coach);
        this.description = description;
        this.goal = goal;
        this.daysPerWeek = daysPerWeek;
        this.durationWeeks = durationWeeks;
        this.template = template;
    }

    public void rename(String newName) {
        this.name = Objects.requireNonNull(newName, "name").trim();
    }

    // Agrega un día al final de la rutina
    public RoutineDay addDay(String name) {
        RoutineDay day = new RoutineDay(this, name, (short) (days.size() + 1));
        days.add(day);
        return day;
    }

    // Deja exactamente estos días y en este orden (dayNumber desde 1): los que no están se borran (orphanRemoval).
    // Los nuevos se crean con newDay
    public void replaceDays(List<RoutineDay> ordered) {
        for (RoutineDay day : ordered) {
            if (!this.equals(day.getRoutine())) {
                throw new IllegalArgumentException("El día pertenece a otra rutina");
            }
        }
        days.removeIf(day -> !ordered.contains(day));
        for (int i = 0; i < ordered.size(); i++) {
            RoutineDay day = ordered.get(i);
            day.setDayNumber((short) (i + 1));
            if (!days.contains(day)) {
                days.add(day);
            }
        }
        days.sort(Comparator.comparingInt(RoutineDay::getDayNumber));
    }

    // Día todavía fuera de la rutina, para pasarlo a replaceDays
    public RoutineDay newDay(String name) {
        return new RoutineDay(this, name, (short) (days.size() + 1));
    }

    // Copia independiente (US-15): mismos datos, días y ejercicios, con otro nombre. Nunca comparte filas
    // con el original, así que editar la copia no toca las series registradas de la rutina original
    public Routine duplicate(String newName) {
        Routine copy = new Routine(newName, coach, description, goal, daysPerWeek, durationWeeks, template);
        for (RoutineDay day : days) {
            RoutineDay dayCopy = copy.addDay(day.getName());
            day.getExercises().forEach(exercise -> dayCopy.addExercise(exercise.copy()));
        }
        return copy;
    }

    public List<RoutineDay> getDays() {
        return Collections.unmodifiableList(days);
    }

    // Solo lee el id del entrenador: con el proxy LAZY no dispara una consulta
    public boolean isOwnedBy(UUID coachId) {
        return coach.getId() != null && coach.getId().equals(coachId);
    }

    // equals/hashCode por id: patrón seguro para entidades JPA (no usar @Data)
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Routine other)) return false;
        return id != null && id.equals(other.getId());
    }

    @Override
    public int hashCode() {
        return Routine.class.hashCode();
    }
}
