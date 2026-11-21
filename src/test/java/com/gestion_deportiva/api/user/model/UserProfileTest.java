package com.gestion_deportiva.api.user.model;

import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.user.model.enums.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import static com.gestion_deportiva.api.support.IdentityFixtures.PASSWORD_HASH;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

// US-48 · Reglas del perfil propio en la entidad User: datos comunes, normalización y foto de perfil
class UserProfileTest {

    private Coach ana;

    @BeforeEach
    void setUp() {
        ana = coach("ana@test.com");
    }

    // ---------- changeProfile ----------

    @Test
    void shouldChangeNamesEmailAndPhone() {
        ana.changeProfile("Ana María", "Paz Gil", "Ana.Nueva@Test.com", "+54 11 1111-1111");

        assertEquals("Ana María", ana.getFirstName());
        assertEquals("Paz Gil", ana.getLastName());
        assertEquals("ana.nueva@test.com", ana.getEmail());
        assertEquals("+54 11 1111-1111", ana.getPhone());
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   ", "\t"})
    void shouldStoreAPhoneBlankOrNullAsNull(String phone) {
        ana.changeProfile("Ana", "Paz", "ana@test.com", phone);

        assertNull(ana.getPhone());
    }

    @Test
    void shouldStripTheSpacesAroundThePhone() {
        ana.changeProfile("Ana", "Paz", "ana@test.com", "  +54 11 2222-2222  ");

        assertEquals("+54 11 2222-2222", ana.getPhone());
    }

    @Test
    void shouldNormalizeTheEmailLikeTheRegistration() {
        ana.changeProfile("Ana", "Paz", "  ANA@Test.COM ", null);

        assertEquals("ana@test.com", ana.getEmail());
    }

    @Test
    void shouldKeepTheRoleAndThePasswordWhenChangingTheProfile() {
        ana.changeProfile("Ana", "Paz", "otra@test.com", null);

        assertEquals(Role.COACH, ana.getRole());
        assertEquals(PASSWORD_HASH, ana.getPasswordHash());
    }

    @Test
    void shouldRejectMissingNames() {
        assertThrows(NullPointerException.class, () -> ana.changeProfile(null, "Paz", "ana@test.com", null));
        assertThrows(NullPointerException.class, () -> ana.changeProfile("Ana", null, "ana@test.com", null));
    }

    @Test
    void shouldRejectMissingEmail() {
        assertThrows(NullPointerException.class, () -> ana.changeProfile("Ana", "Paz", null, null));
    }

    // ---------- foto de perfil ----------

    @Test
    void shouldStartWithoutPhoto() {
        assertFalse(ana.hasProfilePhoto());
        assertNull(ana.getProfilePhotoPath());
    }

    @Test
    void shouldStoreThePhotoPath() {
        ana.changeProfilePhoto("profile-photos/" + ana.getId() + "/foto.jpg");

        assertTrue(ana.hasProfilePhoto());
        assertEquals("profile-photos/" + ana.getId() + "/foto.jpg", ana.getProfilePhotoPath());
    }

    @Test
    void shouldReplaceThePreviousPhoto() {
        ana.changeProfilePhoto("profile-photos/a.jpg");

        ana.changeProfilePhoto("profile-photos/b.png");

        assertEquals("profile-photos/b.png", ana.getProfilePhotoPath());
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   "})
    void shouldRejectABlankPhotoPath(String path) {
        assertThrows(IllegalArgumentException.class, () -> ana.changeProfilePhoto(path));
    }

    @Test
    void shouldRejectAPhotoPathLongerThanTheColumn() {
        assertThrows(IllegalArgumentException.class, () -> ana.changeProfilePhoto("p".repeat(256)));
    }

    @Test
    void shouldAcceptAPhotoPathOfExactlyTheColumnLength() {
        String path = "p".repeat(255);

        ana.changeProfilePhoto(path);

        assertEquals(path, ana.getProfilePhotoPath());
    }

    @Test
    void shouldRemoveThePhoto() {
        ana.changeProfilePhoto("profile-photos/a.jpg");

        ana.removeProfilePhoto();

        assertFalse(ana.hasProfilePhoto());
        assertNull(ana.getProfilePhotoPath());
    }

    @Test
    void shouldDoNothingWhenRemovingAMissingPhoto() {
        ana.removeProfilePhoto();

        assertFalse(ana.hasProfilePhoto());
    }
}
