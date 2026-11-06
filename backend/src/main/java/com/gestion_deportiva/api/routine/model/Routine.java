package com.gestion_deportiva.api.routine.model;

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
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

// Rutina de entrenamiento del entrenador (US-13). Los días y ejercicios se configuran después (US-14)
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
