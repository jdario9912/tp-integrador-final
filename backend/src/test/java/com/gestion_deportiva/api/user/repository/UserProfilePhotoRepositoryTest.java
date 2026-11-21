package com.gestion_deportiva.api.user.repository;

import com.gestion_deportiva.api.AbstractIntegrationTest;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
import com.gestion_deportiva.api.user.model.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

// US-48 · La columna users.profile_photo_path de la V21 en la base real: se guarda y se lee, y las reglas que la base
// hace cumplir (sin vacíos, ruta única entre usuarios, nulos permitidos) funcionan aunque alguien escriba sin la aplicación
class UserProfilePhotoRepositoryTest extends AbstractIntegrationTest {

    @Autowired
    private CoachRepository coachRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void appliesTheV21Migration() {
        Integer applied = jdbc.queryForObject(
                "select count(*) from flyway_schema_history where version = '21' and success", Integer.class);

        assertEquals(1, applied);
    }

    @Test
    void createsTheUniquePartialIndexOnThePhotoPath() {
        Integer count = jdbc.queryForObject("select count(*) from pg_indexes"
                + " where indexname = 'ux_users_profile_photo_path'"
                + " and indexdef like '%WHERE%profile_photo_path IS NOT NULL%'", Integer.class);

        assertEquals(1, count);
    }

    @Test
    void shouldStartWithoutPhotoAndKeepTheNullInTheDatabase() {
        Coach ana = coachRepository.saveAndFlush(coach("ana@test.com"));

        User reloaded = userRepository.findById(ana.getId()).orElseThrow();

        assertFalse(reloaded.hasProfilePhoto());
        assertNull(reloaded.getProfilePhotoPath());
    }

    @Test
    void shouldPersistAndReloadThePhotoPath() {
        Coach ana = coachRepository.saveAndFlush(coach("ana@test.com"));
        String path = "profile-photos/" + ana.getId() + "/foto.jpg";
        ana.changeProfilePhoto(path);
        coachRepository.saveAndFlush(ana);

        User reloaded = userRepository.findById(ana.getId()).orElseThrow();

        assertEquals(path, reloaded.getProfilePhotoPath());
        assertTrue(reloaded.hasProfilePhoto());
    }

    @Test
    void shouldRemoveThePhotoPathBackToNull() {
        Coach ana = coachRepository.saveAndFlush(coach("ana@test.com"));
        ana.changeProfilePhoto("profile-photos/" + ana.getId() + "/foto.jpg");
        coachRepository.saveAndFlush(ana);

        ana.removeProfilePhoto();
        coachRepository.saveAndFlush(ana);

        assertNull(userRepository.findById(ana.getId()).orElseThrow().getProfilePhotoPath());
    }

    // El CHECK de la base: una ruta vacía o solo con espacios no entra, igual que en el dominio
    @Test
    void rejectsABlankPhotoPathInTheDatabase() {
        Coach ana = coachRepository.saveAndFlush(coach("ana@test.com"));

        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update(
                "update users set profile_photo_path = ? where id = ?", "   ", ana.getId()));
    }

    // Dos usuarios no pueden compartir la misma ruta de objeto
    @Test
    void rejectsTheSamePhotoPathForTwoUsers() {
        Coach ana = coachRepository.saveAndFlush(coach("ana@test.com"));
        Coach bea = coachRepository.saveAndFlush(coach("bea@test.com"));
        String path = "profile-photos/" + ana.getId() + "/foto.jpg";
        jdbc.update("update users set profile_photo_path = ? where id = ?", path, ana.getId());

        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update(
                "update users set profile_photo_path = ? where id = ?", path, bea.getId()));
    }

    // Los usuarios sin foto (null) no chocan entre sí: el índice es parcial
    @Test
    void allowsManyUsersWithoutPhoto() {
        coachRepository.saveAndFlush(coach("ana@test.com"));
        coachRepository.saveAndFlush(coach("bea@test.com"));

        Integer withoutPhoto = jdbc.queryForObject(
                "select count(*) from users where profile_photo_path is null", Integer.class);

        assertTrue(withoutPhoto >= 2);
    }
}
