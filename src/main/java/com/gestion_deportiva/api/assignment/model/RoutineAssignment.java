package com.gestion_deportiva.api.assignment.model;

import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.routine.model.Routine;
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

import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;

// Rutina asignada a un atleta (US-16). Nace activa; al asignarle otra, esta pasa a inactiva y queda en el
// historial (una sola activa por atleta, ux_routine_assignments_athlete_active)
@Entity
@Table(name = "routine_assignments")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED) // lo exige JPA
public class RoutineAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // El atleta y la rutina no cambian después del alta
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "athlete_id", nullable = false, updatable = false)
    private Athlete athlete;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "routine_id", nullable = false, updatable = false)
    private Routine routine;

    // "Hoy" en la zona de la app al momento de asignar (lo fija el service con su Clock)
    @Column(name = "assignment_date", nullable = false, updatable = false)
    private LocalDate assignmentDate;

    @Column(nullable = false)
    private boolean active;

    @Builder
    private RoutineAssignment(Athlete athlete, Routine routine, LocalDate assignmentDate) {
        this.athlete = Objects.requireNonNull(athlete, "athlete");
        this.routine = Objects.requireNonNull(routine, "routine");
        this.assignmentDate = Objects.requireNonNull(assignmentDate, "assignmentDate");
        this.active = true;
    }

    // La reemplaza otra asignación: queda en el historial
    public void deactivate() {
        this.active = false;
    }

    // equals/hashCode por id: patrón seguro para entidades JPA (no usar @Data)
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof RoutineAssignment other)) return false;
        return id != null && id.equals(other.getId());
    }

    @Override
    public int hashCode() {
        return RoutineAssignment.class.hashCode();
    }
}
