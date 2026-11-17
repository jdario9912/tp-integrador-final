package com.gestion_deportiva.api.meal.service;

import com.gestion_deportiva.api.athlete.exception.AthleteAccessDeniedException;
import com.gestion_deportiva.api.athlete.service.AthleteAccessGuard;
import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import com.gestion_deportiva.api.common.time.AppClock;
import com.gestion_deportiva.api.config.TimeZoneProperties;
import com.gestion_deportiva.api.meal.dto.MealResponse;
import com.gestion_deportiva.api.meal.dto.ReviewMealRequest;
import com.gestion_deportiva.api.meal.exception.MealNotFoundException;
import com.gestion_deportiva.api.meal.model.Meal;
import com.gestion_deportiva.api.meal.model.enums.MealType;
import com.gestion_deportiva.api.meal.repository.MealRepository;
import com.gestion_deportiva.api.user.model.enums.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;

import static com.gestion_deportiva.api.support.IdentityFixtures.athlete;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static com.gestion_deportiva.api.support.MealFixtures.DATE;
import static com.gestion_deportiva.api.support.MealFixtures.meal;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

// Revisión del entrenador sobre una comida (US-25): pertenencia antes que la búsqueda, 404 de la comida ajena y la
// revisión con la hora del reloj. Mockito: el repositorio y el guard son mocks
@ExtendWith(MockitoExtension.class)
class MealReviewServiceTest {

    private static final UUID ATHLETE_ID = UUID.randomUUID();
    private static final UUID MEAL_ID = UUID.randomUUID();
    private static final AuthenticatedUser COACH_USER = new AuthenticatedUser(UUID.randomUUID(), Role.COACH);
    // Con nanosegundos: la revisión se guarda a microsegundos
    private static final Instant NOW = Instant.parse("2026-11-13T16:00:00.654321987Z");

    @Mock
    private MealRepository mealRepository;

    @Mock
    private AthleteAccessGuard athleteAccessGuard;

    private MealReviewService service;

    private Meal lunch;

    @BeforeEach
    void setUp() {
        AppClock appClock = new AppClock(Clock.fixed(NOW, ZoneOffset.UTC),
                new TimeZoneProperties(TimeZoneProperties.DEFAULT_TIME_ZONE));
        service = new MealReviewService(mealRepository, athleteAccessGuard, appClock);
        lunch = meal(athlete("leo@test.com", coach("ana@test.com")), DATE, MealType.LUNCH, "Milanesa");
    }

    @Test
    void shouldVerifyTheAccessBeforeLookingUpTheMeal() {
        when(mealRepository.findByIdAndAthleteId(MEAL_ID, ATHLETE_ID)).thenReturn(Optional.of(lunch));
        when(mealRepository.saveAndFlush(lunch)).thenReturn(lunch);

        service.review(COACH_USER, ATHLETE_ID, MEAL_ID, new ReviewMealRequest("Bien"));

        InOrder order = inOrder(athleteAccessGuard, mealRepository);
        order.verify(athleteAccessGuard).verifyAccess(COACH_USER, ATHLETE_ID);
        order.verify(mealRepository).findByIdAndAthleteId(MEAL_ID, ATHLETE_ID);
    }

    @Test
    void shouldReviewTheMealWithTheClockAndReturnItWithTheObservation() {
        when(mealRepository.findByIdAndAthleteId(MEAL_ID, ATHLETE_ID)).thenReturn(Optional.of(lunch));
        when(mealRepository.saveAndFlush(lunch)).thenReturn(lunch);

        MealResponse response = service.review(COACH_USER, ATHLETE_ID, MEAL_ID,
                new ReviewMealRequest("  Sumá verduras  "));

        assertEquals(NOW.truncatedTo(ChronoUnit.MICROS), response.review().reviewedAt());
        assertEquals("Sumá verduras", response.review().observation());
    }

    // Sin body: revisada, sin comentario
    @Test
    void shouldReviewWithoutObservationWhenThereIsNoBody() {
        when(mealRepository.findByIdAndAthleteId(MEAL_ID, ATHLETE_ID)).thenReturn(Optional.of(lunch));
        when(mealRepository.saveAndFlush(lunch)).thenReturn(lunch);

        MealResponse response = service.review(COACH_USER, ATHLETE_ID, MEAL_ID, null);

        assertNotNull(response.review());
        assertNull(response.review().observation());
    }

    @Test
    void shouldReturn404WhenTheMealIsMissingOrOfAnotherAthlete() {
        when(mealRepository.findByIdAndAthleteId(MEAL_ID, ATHLETE_ID)).thenReturn(Optional.empty());

        assertThrows(MealNotFoundException.class,
                () -> service.review(COACH_USER, ATHLETE_ID, MEAL_ID, new ReviewMealRequest("Hola")));

        verify(mealRepository, never()).saveAndFlush(any());
    }

    @Test
    void shouldNotLookUpTheMealWhenTheCoachHasNoAccess() {
        doThrow(new AthleteAccessDeniedException()).when(athleteAccessGuard).verifyAccess(COACH_USER, ATHLETE_ID);

        assertThrows(AthleteAccessDeniedException.class,
                () -> service.review(COACH_USER, ATHLETE_ID, MEAL_ID, new ReviewMealRequest("Hola")));

        verifyNoInteractions(mealRepository);
    }
}
