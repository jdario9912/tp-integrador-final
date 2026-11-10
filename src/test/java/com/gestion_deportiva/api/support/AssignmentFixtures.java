package com.gestion_deportiva.api.support;

import com.gestion_deportiva.api.assignment.dto.AssignRoutineRequest;
import com.gestion_deportiva.api.assignment.model.RoutineAssignment;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.exercise.model.Exercise;
import com.gestion_deportiva.api.routine.model.Routine;

import java.time.LocalDate;
import java.util.UUID;

import static com.gestion_deportiva.api.support.RoutineFixtures.routine;
import static com.gestion_deportiva.api.support.RoutineFixtures.routineExercise;

// Datos de prueba reutilizables para la asignación de rutinas (US-16)
public final class AssignmentFixtures {

    private AssignmentFixtures() {
    }

    // Rutina lista para asignar: un día con un ejercicio
    public static Routine completeRoutine(String name, Coach coach, Exercise exercise) {
        Routine routine = routine(name, coach);
        routine.addDay("Empuje").addExercise(routineExercise(exercise));
        return routine;
    }

    public static RoutineAssignment assignment(Athlete athlete, Routine routine, LocalDate assignmentDate) {
        return RoutineAssignment.builder()
                .athlete(athlete)
                .routine(routine)
                .assignmentDate(assignmentDate)
                .build();
    }

    public static AssignRoutineRequest assignRequest(UUID routineId, Boolean replaceActive) {
        return new AssignRoutineRequest(routineId, replaceActive);
    }
}
