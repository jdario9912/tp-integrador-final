package com.gestion_deportiva.api.model;

import com.gestion_deportiva.api.model.enums.Role;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.UUID;

import static com.gestion_deportiva.api.support.IdentityFixtures.PASSWORD_HASH;
import static com.gestion_deportiva.api.support.IdentityFixtures.athlete;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Cubre también el comportamiento común de User (Coach es una subclase concreta)
class CoachTest {

    @Test
    void newCoachHasCoachRoleAndIsActive() {
        Coach coach = coach("ana@test.com");

        assertEquals(Role.COACH, coach.getRole());
        assertTrue(coach.isActive());
        assertNull(coach.getId());
        assertNull(coach.getLastLoginAt());
    }

    @Test
    void emailIsNormalized() {
        Coach coach = coach("  Ana.Paz@Test.COM ");
        assertEquals("ana.paz@test.com", coach.getEmail());

        coach.changeEmail(" OTRO@Mail.com");
        assertEquals("otro@mail.com", coach.getEmail());
    }

    @Test
    void requiredFieldsCannotBeNull() {
        assertThrows(NullPointerException.class, () -> new Coach(null, "Paz", "a@test.com", PASSWORD_HASH));
        assertThrows(NullPointerException.class, () -> new Coach("Ana", null, "a@test.com", PASSWORD_HASH));
        assertThrows(NullPointerException.class, () -> new Coach("Ana", "Paz", null, PASSWORD_HASH));
        assertThrows(NullPointerException.class, () -> new Coach("Ana", "Paz", "a@test.com", null));
    }

    @Test
    void fullNameJoinsFirstAndLastName() {
        assertEquals("Ana Paz", coach("a@test.com").fullName());
    }

    @Test
    void changePasswordReplacesHashAndRejectsNull() {
        Coach coach = coach("a@test.com");

        coach.changePassword("nuevoHash");
        assertEquals("nuevoHash", coach.getPasswordHash());
        assertThrows(NullPointerException.class, () -> coach.changePassword(null));
    }

    @Test
    void recordLoginStoresTheMoment() {
        Coach coach = coach("a@test.com");
        Instant now = Instant.parse("2026-10-13T10:00:00Z");

        coach.recordLogin(now);
        assertEquals(now, coach.getLastLoginAt());
        assertThrows(NullPointerException.class, () -> coach.recordLogin(null));
    }

    @Test
    void deactivateAndReactivate() {
        Coach coach = coach("a@test.com");

        coach.deactivate();
        assertFalse(coach.isActive());
        coach.reactivate();
        assertTrue(coach.isActive());
    }

    @Test
    void professionalProfileIsOptional() {
        Coach coach = coach("a@test.com");
        assertNull(coach.getSpecialty());

        coach.setSpecialty("Fuerza");
        coach.setLicenseNumber("MP-123");
        coach.setBio("Entrenadora de powerlifting");
        assertEquals("Fuerza", coach.getSpecialty());
        assertEquals("MP-123", coach.getLicenseNumber());
        assertEquals("Entrenadora de powerlifting", coach.getBio());
    }

    @Test
    void isOwnerOfOnlyItsOwnAthletes() {
        Coach coach = withId(coach("coach@test.com"));
        Coach otherCoach = withId(coach("otro@test.com"));

        assertTrue(coach.isOwnerOf(athlete("a@test.com", coach)));
        assertFalse(coach.isOwnerOf(athlete("b@test.com", otherCoach)));
        assertFalse(coach.isOwnerOf(athlete("c@test.com", null)));
        assertFalse(coach.isOwnerOf(null));
    }

    @Test
    void unsavedCoachIsNotOwnerOfAnyone() {
        Coach unsaved = coach("coach@test.com");
        assertFalse(unsaved.isOwnerOf(athlete("a@test.com", unsaved)));
    }

    @Test
    void equalityIsById() {
        UUID id = UUID.randomUUID();
        Coach a = coach("a@test.com");
        Coach b = coach("b@test.com");
        ReflectionTestUtils.setField(a, "id", id);
        ReflectionTestUtils.setField(b, "id", id);

        assertEquals(a, b);
        assertEquals(a.hashCode(), b.hashCode());
        assertNotEquals(a, withId(coach("c@test.com")));
        assertNotEquals(coach("x@test.com"), coach("x@test.com")); // sin id no son iguales
    }

    private static Coach withId(Coach coach) {
        ReflectionTestUtils.setField(coach, "id", UUID.randomUUID());
        return coach;
    }
}
