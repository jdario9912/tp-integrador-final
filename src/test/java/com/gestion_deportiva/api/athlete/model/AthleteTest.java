package com.gestion_deportiva.api.athlete.model;

import com.gestion_deportiva.api.athlete.model.enums.AthleteStatus;
import com.gestion_deportiva.api.athlete.model.enums.ExperienceLevel;
import com.gestion_deportiva.api.athlete.model.enums.Sex;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.user.model.enums.Role;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.OptionalInt;

import static com.gestion_deportiva.api.support.IdentityFixtures.athlete;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;

class AthleteTest {

    @Test
    void newAthleteHasAthleteRoleActiveStatusAndItsCoach() {
        Coach coach = coach("coach@test.com");
        Athlete athlete = athlete("Leo@Test.com", coach);

        assertEquals(Role.ATHLETE, athlete.getRole());
        assertEquals(AthleteStatus.ACTIVE, athlete.getStatus());
        assertSame(coach, athlete.getCoach());
        assertEquals("leo@test.com", athlete.getEmail());
    }

    @Test
    void canBeCreatedWithoutCoachAndOptionalDataStartsEmpty() {
        Athlete athlete = athlete("a@test.com", null);

        assertNull(athlete.getCoach());
        assertNull(athlete.getSex());
        assertNull(athlete.getExperienceLevel());
        assertNull(athlete.getBirthDate());
        assertNull(athlete.getHeightCm());
        assertNull(athlete.getAvailableDays());
    }

    @Test
    void optionalProfileDataCanBeSet() {
        Athlete athlete = athlete("a@test.com", null);

        athlete.setSex(Sex.FEMALE);
        athlete.setExperienceLevel(ExperienceLevel.INTERMEDIATE);
        athlete.setHeightCm(new BigDecimal("172.50"));
        athlete.setInitialWeightKg(new BigDecimal("68.30"));
        athlete.setGoal("Hipertrofia");
        athlete.setInjuries("Hombro derecho");
        athlete.setLimitations("Sin saltos");
        athlete.setStartDate(LocalDate.of(2026, 10, 1));

        assertEquals(Sex.FEMALE, athlete.getSex());
        assertEquals(ExperienceLevel.INTERMEDIATE, athlete.getExperienceLevel());
        assertEquals(new BigDecimal("172.50"), athlete.getHeightCm());
        assertEquals(new BigDecimal("68.30"), athlete.getInitialWeightKg());
        assertEquals("Hipertrofia", athlete.getGoal());
        assertEquals("Hombro derecho", athlete.getInjuries());
        assertEquals("Sin saltos", athlete.getLimitations());
        assertEquals(LocalDate.of(2026, 10, 1), athlete.getStartDate());
    }

    @Test
    void assignAndUnassignCoach() {
        Athlete athlete = athlete("a@test.com", null);
        Coach coach = coach("coach@test.com");

        athlete.assignCoach(coach);
        assertSame(coach, athlete.getCoach());

        athlete.unassignCoach();
        assertNull(athlete.getCoach());

        assertThrows(NullPointerException.class, () -> athlete.assignCoach(null));
    }

    @Test
    void changeStatusRejectsNull() {
        Athlete athlete = athlete("a@test.com", null);

        athlete.changeStatus(AthleteStatus.NEEDS_REVIEW);
        assertEquals(AthleteStatus.NEEDS_REVIEW, athlete.getStatus());
        assertThrows(NullPointerException.class, () -> athlete.changeStatus(null));
    }

    @Test
    void availableDaysMustBeBetweenOneAndSeven() {
        Athlete athlete = athlete("a@test.com", null);

        athlete.setAvailableDays((short) 1);
        assertEquals((short) 1, athlete.getAvailableDays());
        athlete.setAvailableDays((short) 7);
        assertEquals((short) 7, athlete.getAvailableDays());
        athlete.setAvailableDays(null);
        assertNull(athlete.getAvailableDays());

        assertThrows(IllegalArgumentException.class, () -> athlete.setAvailableDays((short) 0));
        assertThrows(IllegalArgumentException.class, () -> athlete.setAvailableDays((short) 8));
    }

    @Test
    void builderCreatesAthleteWithProfileActiveStatusAndNormalizedEmail() {
        Coach coach = coach("coach@test.com");

        Athlete athlete = Athlete.builder()
                .firstName("Leo").lastName("Gil").email("  Leo@Test.com ").passwordHash("hash")
                .coach(coach)
                .phone("+54 11 4444-4444")
                .sex(Sex.MALE)
                .experienceLevel(ExperienceLevel.BEGINNER)
                .birthDate(LocalDate.of(2000, 5, 20))
                .heightCm(new BigDecimal("178.50"))
                .initialWeightKg(new BigDecimal("80.25"))
                .goal("Fuerza").injuries("Ninguna").limitations("Ninguna")
                .availableDays((short) 3)
                .startDate(LocalDate.of(2026, 11, 1))
                .build();

        assertEquals(Role.ATHLETE, athlete.getRole());
        assertEquals(AthleteStatus.ACTIVE, athlete.getStatus());
        assertSame(coach, athlete.getCoach());
        assertEquals("leo@test.com", athlete.getEmail());
        assertEquals("+54 11 4444-4444", athlete.getPhone());
        assertEquals(Sex.MALE, athlete.getSex());
        assertEquals(ExperienceLevel.BEGINNER, athlete.getExperienceLevel());
        assertEquals(LocalDate.of(2000, 5, 20), athlete.getBirthDate());
        assertEquals(new BigDecimal("178.50"), athlete.getHeightCm());
        assertEquals(new BigDecimal("80.25"), athlete.getInitialWeightKg());
        assertEquals("Fuerza", athlete.getGoal());
        assertEquals((short) 3, athlete.getAvailableDays());
        assertEquals(LocalDate.of(2026, 11, 1), athlete.getStartDate());
    }

    @Test
    void builderRejectsAvailableDaysOutOfRangeAndMissingRequiredData() {
        assertThrows(IllegalArgumentException.class, () -> Athlete.builder()
                .firstName("Leo").lastName("Gil").email("a@test.com").passwordHash("hash")
                .availableDays((short) 8)
                .build());
        assertThrows(NullPointerException.class, () -> Athlete.builder()
                .firstName("Leo").lastName("Gil").passwordHash("hash")
                .build());
    }

    @Test
    void ageIsEmptyWithoutBirthDate() {
        assertEquals(OptionalInt.empty(), athlete("a@test.com", null).age(LocalDate.of(2026, 10, 13)));
    }

    @Test
    void ageCountsOnlyCompletedYears() {
        Athlete athlete = athlete("a@test.com", null);
        athlete.setBirthDate(LocalDate.of(2000, 10, 13));

        assertEquals(OptionalInt.of(25), athlete.age(LocalDate.of(2026, 10, 12)));
        assertEquals(OptionalInt.of(26), athlete.age(LocalDate.of(2026, 10, 13)));
    }
}
