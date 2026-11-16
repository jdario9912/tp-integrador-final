package com.gestion_deportiva.api.training.model;

import com.gestion_deportiva.api.assignment.model.RoutineAssignment;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.routine.model.RoutineDay;
import com.gestion_deportiva.api.training.exception.TrainingSessionAlreadyEndedException;
import com.gestion_deportiva.api.training.exception.TrainingSessionNotReviewableException;
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
import java.time.temporal.ChronoUnit;
import java.util.Objects;
import java.util.UUID;

// Sesión de entrenamiento (US-18): el atleta entrena un día de su rutina activa. Nace IN_PROGRESS con la fecha y la
// hora de inicio; registrar sus series es US-19 y finalizarla o cancelarla, US-20 (finish y cancel, con la hora de
// fin). El atleta, la asignación y el día no cambian después del alta. Una sola en progreso por atleta
// (ux_training_sessions_athlete_in_progress, V10)
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

    // US-20: hora de fin. null mientras está IN_PROGRESS; con FINISHED o CANCELLED, el instante del cierre (V14)
    @Column(name = "ended_at")
    private Instant endedAt;

    // US-21: última revisión del entrenador. null si nunca revisó la sesión; solo se revisan las FINISHED (V15)
    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    // US-21: observación del entrenador (opcional, hasta 1000 caracteres). Revisar de nuevo la reemplaza (V15)
    @Column(name = "coach_observation", length = 1000)
    private String coachObservation;

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

    // US-20 · Finaliza la sesión en ese instante (contrato 14.3). Solo una sesión en progreso se cierra: una ya
    // finalizada o cancelada responde 409 (TrainingSessionAlreadyEndedException) y no cambia
    public void finish(Instant endedAt) {
        end(SessionStatus.FINISHED, endedAt);
    }

    // US-20 · Cancela la sesión en ese instante. Igual que finish: las series registradas se conservan
    public void cancel(Instant endedAt) {
        end(SessionStatus.CANCELLED, endedAt);
    }

    private void end(SessionStatus finalStatus, Instant endedAt) {
        Objects.requireNonNull(endedAt, "endedAt");
        if (!isInProgress()) {
            throw new TrainingSessionAlreadyEndedException();
        }
        this.status = finalStatus;
        // A microsegundos, como guarda PostgreSQL: así la respuesta y una lectura posterior coinciden
        this.endedAt = endedAt.truncatedTo(ChronoUnit.MICROS);
    }

    public boolean isInProgress() {
        return status == SessionStatus.IN_PROGRESS;
    }

    // US-21 · El entrenador revisa la sesión finalizada (contrato 15.4). Solo FINISHED: en progreso o cancelada es
    // una regla de negocio (422) y no cambia nada. Revisar de nuevo reemplaza la observación y el instante, sin
    // duplicar nada. La observación llega ya recortada por el request (null si estaba vacía)
    public void review(Instant reviewedAt, String observation) {
        Objects.requireNonNull(reviewedAt, "reviewedAt");
        if (status != SessionStatus.FINISHED) {
            throw new TrainingSessionNotReviewableException();
        }
        // A microsegundos, igual que endedAt: la respuesta y una lectura posterior coinciden
        this.reviewedAt = reviewedAt.truncatedTo(ChronoUnit.MICROS);
        this.coachObservation = observation;
    }

    public boolean isReviewed() {
        return reviewedAt != null;
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
