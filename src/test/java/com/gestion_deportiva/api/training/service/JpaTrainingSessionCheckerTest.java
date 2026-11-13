package com.gestion_deportiva.api.training.service;

import com.gestion_deportiva.api.training.repository.TrainingSessionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

// La consulta en sí se prueba en TrainingSessionRepositoryTest y la regla completa, en RoutineE2ETest
@ExtendWith(MockitoExtension.class)
class JpaTrainingSessionCheckerTest {

    @Mock
    private TrainingSessionRepository trainingSessionRepository;

    @Test
    void shouldAskTheRepositoryAboutThoseDays() {
        // Arrange
        Set<UUID> days = Set.of(UUID.randomUUID(), UUID.randomUUID());
        when(trainingSessionRepository.existsByRoutineDayIdIn(days)).thenReturn(true);

        // Act + Assert
        assertTrue(new JpaTrainingSessionChecker(trainingSessionRepository).hasTrainingSessions(days));
    }

    @Test
    void shouldAnswerFalseWithoutQueryingWhenThereAreNoDays() {
        assertFalse(new JpaTrainingSessionChecker(trainingSessionRepository).hasTrainingSessions(List.of()));
        verifyNoInteractions(trainingSessionRepository);
    }
}
