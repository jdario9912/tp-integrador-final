package com.gestion_deportiva.api.training.service;

import com.gestion_deportiva.api.training.repository.PerformedSetRepository;
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

// La consulta en sí se prueba en PerformedSetRepositoryTest y el checker contra la base, en
// JpaPerformedSetCheckerIntegrationTest. Acá, solo la regla de no consultar sin ejercicios
@ExtendWith(MockitoExtension.class)
class JpaPerformedSetCheckerTest {

    @Mock
    private PerformedSetRepository performedSetRepository;

    @Test
    void shouldAskTheRepositoryAboutThoseExercises() {
        // Arrange
        Set<UUID> exercises = Set.of(UUID.randomUUID(), UUID.randomUUID());
        when(performedSetRepository.existsByRoutineExerciseIdIn(exercises)).thenReturn(true);

        // Act + Assert
        assertTrue(new JpaPerformedSetChecker(performedSetRepository).hasPerformedSets(exercises));
    }

    @Test
    void shouldAnswerFalseWithoutQueryingWhenThereAreNoExercises() {
        assertFalse(new JpaPerformedSetChecker(performedSetRepository).hasPerformedSets(List.of()));
        verifyNoInteractions(performedSetRepository);
    }
}
