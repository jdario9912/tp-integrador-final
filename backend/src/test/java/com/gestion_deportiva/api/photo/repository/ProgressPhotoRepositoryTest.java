package com.gestion_deportiva.api.photo.repository;

import com.gestion_deportiva.api.AbstractIntegrationTest;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.repository.AthleteRepository;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
import com.gestion_deportiva.api.photo.model.ProgressPhoto;
import com.gestion_deportiva.api.photo.model.enums.ProgressPhotoType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static com.gestion_deportiva.api.support.IdentityFixtures.athlete;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static com.gestion_deportiva.api.support.ProgressPhotoFixtures.CREATED_AT;
import static com.gestion_deportiva.api.support.ProgressPhotoFixtures.progressPhoto;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ProgressPhotoRepositoryTest extends AbstractIntegrationTest {

    private static final LocalDate OCT_30 = LocalDate.of(2026, 10, 30);
    private static final LocalDate NOV_1 = LocalDate.of(2026, 11, 1);
    private static final LocalDate NOV_12 = LocalDate.of(2026, 11, 12);

    @Autowired
    private ProgressPhotoRepository progressPhotoRepository;

    @Autowired
    private AthleteRepository athleteRepository;

    @Autowired
    private CoachRepository coachRepository;

    @Autowired
    private JdbcTemplate jdbc;

    private Athlete leo;

    private Athlete mia;

    @BeforeEach
    void setUp() {
        Coach ana = coachRepository.saveAndFlush(coach("ana@test.com"));
        leo = athleteRepository.saveAndFlush(athlete("leo@test.com", ana));
        mia = athleteRepository.saveAndFlush(athlete("mia@test.com", ana));
    }

    @Test
    void savesThePhotoWithItsTypeAsCatalogIdAndItsTimestamps() {
        // Act
        ProgressPhoto saved = progressPhotoRepository.saveAndFlush(
                progressPhoto(leo, ProgressPhotoType.SIDE, NOV_12, "progress/leo/foto.jpg"));

        // Assert: la fila guarda el id del catálogo (2 = SIDE) y la fecha y el instante con su precisión
        assertNotNull(saved.getId());
        Map<String, Object> row = jdbc.queryForMap("select athlete_id::text as athlete_id, type_id, taken_on,"
                + " storage_path, created_at from progress_photos where id = ?", saved.getId());
        assertEquals(leo.getId().toString(), row.get("athlete_id"));
        assertEquals((short) 2, ((Number) row.get("type_id")).shortValue());
        assertEquals(NOV_12, ((java.sql.Date) row.get("taken_on")).toLocalDate());
        assertEquals("progress/leo/foto.jpg", row.get("storage_path"));
        assertEquals(CREATED_AT, ((Timestamp) row.get("created_at")).toInstant());
    }

    @Test
    void rejectsTwoPhotosWithTheSameStoragePath() {
        progressPhotoRepository.saveAndFlush(progressPhoto(leo, ProgressPhotoType.FRONT, NOV_12, "progress/x.jpg"));

        assertThrows(DataIntegrityViolationException.class, () -> progressPhotoRepository.saveAndFlush(
                progressPhoto(leo, ProgressPhotoType.BACK, NOV_12, "progress/x.jpg")));
    }

    @Test
    void listsTheOldestTakenOnFirstAndBreaksTiesByCreationAndThenId() {
        // Arrange: las fotos entran desordenadas
        ProgressPhoto newest = progressPhotoRepository.saveAndFlush(
                progressPhoto(leo, ProgressPhotoType.FRONT, NOV_12, "progress/a.jpg", CREATED_AT));
        ProgressPhoto sameDayLater = progressPhotoRepository.saveAndFlush(
                progressPhoto(leo, ProgressPhotoType.SIDE, NOV_1, "progress/b.jpg",
                        Instant.parse("2026-11-01T18:00:00Z")));
        ProgressPhoto sameDayEarlier = progressPhotoRepository.saveAndFlush(
                progressPhoto(leo, ProgressPhotoType.BACK, NOV_1, "progress/c.jpg",
                        Instant.parse("2026-11-01T09:00:00Z")));
        ProgressPhoto oldest = progressPhotoRepository.saveAndFlush(
                progressPhoto(leo, ProgressPhotoType.FRONT, OCT_30, "progress/d.jpg"));

        // Act
        Page<ProgressPhoto> page = progressPhotoRepository.findChronological(leo.getId(), PageRequest.of(0, 20));

        // Assert: de la más antigua a la más nueva; el mismo día, primero la creada antes
        assertEquals(List.of(oldest, sameDayEarlier, sameDayLater, newest), page.getContent());
    }

    @Test
    void pagesTheListingAndIgnoresTheSortAskedByTheClient() {
        progressPhotoRepository.saveAndFlush(progressPhoto(leo, ProgressPhotoType.FRONT, OCT_30, "progress/1.jpg"));
        ProgressPhoto middle = progressPhotoRepository.saveAndFlush(
                progressPhoto(leo, ProgressPhotoType.SIDE, NOV_1, "progress/2.jpg"));
        progressPhotoRepository.saveAndFlush(progressPhoto(leo, ProgressPhotoType.BACK, NOV_12, "progress/3.jpg"));

        // Act: el sort pedido por el cliente (descendente por ruta) no cambia el orden fijo del listado
        Page<ProgressPhoto> page = progressPhotoRepository.findChronological(leo.getId(),
                PageRequest.of(1, 1, Sort.by(Sort.Direction.DESC, "storagePath")));

        // Assert
        assertEquals(List.of(middle), page.getContent());
        assertEquals(3, page.getTotalElements());
        assertEquals(3, page.getTotalPages());
    }

    @Test
    void listsOnlyThePhotosOfTheGivenAthlete() {
        ProgressPhoto ofLeo = progressPhotoRepository.saveAndFlush(
                progressPhoto(leo, ProgressPhotoType.FRONT, NOV_12, "progress/leo.jpg"));
        progressPhotoRepository.saveAndFlush(progressPhoto(mia, ProgressPhotoType.FRONT, NOV_12, "progress/mia.jpg"));

        Page<ProgressPhoto> page = progressPhotoRepository.findChronological(leo.getId(), PageRequest.of(0, 20));

        assertEquals(List.of(ofLeo), page.getContent());
    }

    @Test
    void findsAPhotoOnlyForItsOwnAthlete() {
        ProgressPhoto ofLeo = progressPhotoRepository.saveAndFlush(
                progressPhoto(leo, ProgressPhotoType.FRONT, NOV_12, "progress/leo.jpg"));

        Optional<ProgressPhoto> own = progressPhotoRepository.findByIdAndAthleteId(ofLeo.getId(), leo.getId());
        Optional<ProgressPhoto> ofAnother = progressPhotoRepository.findByIdAndAthleteId(ofLeo.getId(), mia.getId());
        Optional<ProgressPhoto> unknown = progressPhotoRepository.findByIdAndAthleteId(UUID.randomUUID(), leo.getId());

        assertTrue(own.isPresent());
        assertFalse(ofAnother.isPresent());
        assertFalse(unknown.isPresent());
    }
}
