package com.gestion_deportiva.api.training.model;

import com.gestion_deportiva.api.assignment.model.RoutineAssignment;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.routine.model.RoutineDay;
import com.gestion_deportiva.api.training.model.enums.SessionStatus;
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
import java.util.Objects;
import java.util.UUID;

// Sesión de entrenamiento (US-18): el atleta entrena un día de su rutina activa. Nace IN_PROGRESS con la fecha y la
// hora de inicio; finalizarla o cancelarla es US-20 y registrar sus series, US-19. El atleta, la asignación y el día
// no cambian después del alta. Una sola en progreso por atleta (ux_training_sessions_athlete_in_progress, V10)
@Entity
@Table(name = "training_sessions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED) // lo exige JPA
public class TrainingSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // Repite el atleta de la asignación: lo necesita el índice único de la sesión en progreso
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "athlete_id", nullable = false, updatable = false)
    private Athlete athlete;

    // La asignación activa al iniciar: si después le asignan otra rutina, la sesión sigue ligada a esta
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "assignment_id", nullable = false, updatable = false)
    private RoutineAssignment assignment;

    // Se lee en vivo: si el entrenador renombra el día o cambia sus ejercicios, la sesión lo muestra
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "routine_day_id", nullable = false, updatable = false)
    private RoutineDay routineDay;

    // Se guarda como id (smallint) gracias a SessionStatusConverter (autoApply)
    @Column(name = "status_id", nullable = false)
    private SessionStatus status;

    // Fecha de startedAt en la zona de la app
    @Column(name = "session_date", nullable = false, updatable = false)
    private LocalDate sessionDate;

    @Column(name = "started_at", nullable = false, updatable = false)
    private Instant startedAt;

    private TrainingSession(RoutineAssignment assignment, RoutineDay routineDay, Instant startedAt,
                            LocalDate sessionDate) {
        this.athlete = assignment.getAthlete();
        this.assignment = assignment;
        this.routineDay = routineDay;
        this.status = SessionStatus.IN_PROGRESS;
        this.startedAt = startedAt;
        this.sessionDate = sessionDate;
    }

    // Inicia el entrenamiento de un día de la rutina de la asignación (el start(day) del UML). Las reglas de negocio
    // (sesión en progreso, rutina vencida, día sin ejercicios) las controla TrainingSessionService antes de llamar
    // acá; un día de otra rutina es un error de programación
    public static TrainingSession start(RoutineAssignment assignment, RoutineDay day, Instant startedAt,
                                        LocalDate sessionDate) {
        Objects.requireNonNull(assignment, "assignment");
        Objects.requireNonNull(day, "day");
        Objects.requireNonNull(startedAt, "startedAt");
        Objects.requireNonNull(sessionDate, "sessionDate");
        if (!assignment.getRoutine().equals(day.getRoutine())) {
            throw new IllegalArgumentException("El día no pertenece a la rutina de la asignación");
        }
        return new TrainingSession(assignment, day, startedAt, sessionDate);
    }

    public boolean isInProgress() {
        return status == SessionStatus.IN_PROGRESS;
    }

    // equals/hashCode por id: patrón seguro para entidades JPA (no usar @Data)
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof TrainingSession other)) return false;
        return id != null && id.equals(other.getId());
    }

    @Override
    public int hashCode() {
        return TrainingSession.class.hashCode();
    }
}
