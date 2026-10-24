package com.gestion_deportiva.api.athlete.service;

import com.gestion_deportiva.api.athlete.exception.AthleteAccessDeniedException;
import com.gestion_deportiva.api.athlete.exception.AthleteNotFoundException;
import com.gestion_deportiva.api.athlete.repository.AthleteRepository;
import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import com.gestion_deportiva.api.user.model.enums.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AthleteAccessGuardTest {

    private static final UUID ATHLETE_ID = UUID.randomUUID();
    private static final UUID COACH_ID = UUID.randomUUID();

    @Mock
    private AthleteRepository athleteRepository;

    private AthleteAccessGuard guard;

    @BeforeEach
    void setUp() {
        guard = new AthleteAccessGuard(athleteRepository);
    }

    @Test
    void shouldAllowTheCoachOfTheAthlete() {
        // Arrange
        givenAthleteExists();
        when(athleteRepository.existsByIdAndCoachId(ATHLETE_ID, COACH_ID)).thenReturn(true);

        // Act + Assert
        assertDoesNotThrow(() -> guard.verifyAccess(new AuthenticatedUser(COACH_ID, Role.COACH), ATHLETE_ID));
    }

    @Test
    void shouldDenyACoachThatDoesNotOwnTheAthlete() {
        // Arrange: atleta de otro entrenador o desvinculado (sin entrenador)
        givenAthleteExists();
        UUID otherCoachId = UUID.randomUUID();
        when(athleteRepository.existsByIdAndCoachId(ATHLETE_ID, otherCoachId)).thenReturn(false);

        // Act
        AthleteAccessDeniedException ex = assertThrows(AthleteAccessDeniedException.class,
                () -> guard.verifyAccess(new AuthenticatedUser(otherCoachId, Role.COACH), ATHLETE_ID));

        // Assert
        assertEquals(AthleteAccessDeniedException.MESSAGE, ex.getMessage());
    }

    @Test
    void shouldAllowTheAthleteToAccessItsOwnData() {
        // Arrange
        givenAthleteExists();

        // Act + Assert
        assertDoesNotThrow(() -> guard.verifyAccess(new AuthenticatedUser(ATHLETE_ID, Role.ATHLETE), ATHLETE_ID));
        verify(athleteRepository, never()).existsByIdAndCoachId(any(), any());
    }

    @Test
    void shouldDenyAnAthleteAccessToAnotherAthlete() {
        // Arrange
        givenAthleteExists();

        // Act + Assert
        assertThrows(AthleteAccessDeniedException.class,
                () -> guard.verifyAccess(new AuthenticatedUser(UUID.randomUUID(), Role.ATHLETE), ATHLETE_ID));
    }

    @Test
    void shouldReturnNotFoundWhenTheAthleteDoesNotExist() {
        // Arrange
        when(athleteRepository.existsById(ATHLETE_ID)).thenReturn(false);

        // Act
        AthleteNotFoundException ex = assertThrows(AthleteNotFoundException.class,
                () -> guard.verifyAccess(new AuthenticatedUser(COACH_ID, Role.COACH), ATHLETE_ID));

        // Assert: no se llega a verificar la pertenencia
        assertEquals(ATHLETE_ID, ex.getAthleteId());
        assertEquals("No existe el atleta con id " + ATHLETE_ID, ex.getMessage());
        verify(athleteRepository, never()).existsByIdAndCoachId(any(), any());
    }

    private void givenAthleteExists() {
        when(athleteRepository.existsById(ATHLETE_ID)).thenReturn(true);
    }
}
