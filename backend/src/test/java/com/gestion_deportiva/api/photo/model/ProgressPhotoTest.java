package com.gestion_deportiva.api.photo.model;

import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.photo.model.enums.ProgressPhotoType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import static com.gestion_deportiva.api.support.IdentityFixtures.athlete;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ProgressPhotoTest {

    private static final LocalDate TAKEN_ON = LocalDate.of(2026, 11, 12);
    private static final Instant CREATED_AT = Instant.parse("2026-11-13T20:14:31.123456789Z");
    private static final String PATH = "progress/3f1c2a9e/0d4e5f6a.jpg";

    private Athlete athlete;

    @BeforeEach
    void setUp() {
        athlete = athlete("leo@test.com", coach("ana@test.com"));
    }

    @Test
    void shouldKeepItsDataAndTheStoragePathInternal() {
        // Act
        ProgressPhoto photo = new ProgressPhoto(athlete, ProgressPhotoType.FRONT, TAKEN_ON, PATH, CREATED_AT);

        // Assert
        assertSame(athlete, photo.getAthlete());
        assertEquals(ProgressPhotoType.FRONT, photo.getType());
        assertEquals(TAKEN_ON, photo.getTakenOn());
        assertEquals(PATH, photo.getStoragePath());
        assertNull(photo.getId());
    }

    @Test
    void shouldTruncateCreatedAtToMicrosecondsLikeThePostgresColumn() {
        ProgressPhoto photo = new ProgressPhoto(athlete, ProgressPhotoType.SIDE, TAKEN_ON, PATH, CREATED_AT);

        assertEquals(Instant.parse("2026-11-13T20:14:31.123456Z"), photo.getCreatedAt());
    }

    @Test
    void shouldRejectMissingRequiredData() {
        assertThrows(NullPointerException.class,
                () -> new ProgressPhoto(null, ProgressPhotoType.FRONT, TAKEN_ON, PATH, CREATED_AT));
        assertThrows(NullPointerException.class,
                () -> new ProgressPhoto(athlete, null, TAKEN_ON, PATH, CREATED_AT));
        assertThrows(NullPointerException.class,
                () -> new ProgressPhoto(athlete, ProgressPhotoType.FRONT, null, PATH, CREATED_AT));
        assertThrows(NullPointerException.class,
                () -> new ProgressPhoto(athlete, ProgressPhotoType.FRONT, TAKEN_ON, PATH, null));
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   "})
    void shouldRejectABlankStoragePath(String path) {
        assertThrows(IllegalArgumentException.class,
                () -> new ProgressPhoto(athlete, ProgressPhotoType.FRONT, TAKEN_ON, path, CREATED_AT));
    }

    @Test
    void shouldRejectAStoragePathLongerThanTheColumn() {
        String tooLong = "a".repeat(256);

        assertThrows(IllegalArgumentException.class,
                () -> new ProgressPhoto(athlete, ProgressPhotoType.FRONT, TAKEN_ON, tooLong, CREATED_AT));
    }

    @Test
    void equalityIsByIdAndAnUnsavedPhotoIsOnlyEqualToItself() {
        ProgressPhoto first = new ProgressPhoto(athlete, ProgressPhotoType.FRONT, TAKEN_ON, PATH, CREATED_AT);
        ProgressPhoto second = new ProgressPhoto(athlete, ProgressPhotoType.FRONT, TAKEN_ON, PATH + "2", CREATED_AT);
        ReflectionTestUtils.setField(first, "id", UUID.fromString("9b1e4c7a-2d3f-4a5b-8c6d-7e8f9a0b1c2d"));
        ReflectionTestUtils.setField(second, "id", UUID.fromString("9b1e4c7a-2d3f-4a5b-8c6d-7e8f9a0b1c2d"));

        assertEquals(first, second);
        assertEquals(first.hashCode(), second.hashCode());
        assertNotEquals(new ProgressPhoto(athlete, ProgressPhotoType.FRONT, TAKEN_ON, PATH, CREATED_AT),
                new ProgressPhoto(athlete, ProgressPhotoType.FRONT, TAKEN_ON, PATH, CREATED_AT));
    }
}
