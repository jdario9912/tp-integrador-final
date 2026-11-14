package com.gestion_deportiva.api.photo.service;

import com.gestion_deportiva.api.athlete.exception.AthleteAccessDeniedException;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.repository.AthleteRepository;
import com.gestion_deportiva.api.athlete.service.AthleteAccessGuard;
import com.gestion_deportiva.api.common.pagination.PageResponse;
import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import com.gestion_deportiva.api.common.time.AppClock;
import com.gestion_deportiva.api.common.upload.ImageFormat;
import com.gestion_deportiva.api.common.upload.ImageValidator;
import com.gestion_deportiva.api.common.upload.ValidatedImage;
import com.gestion_deportiva.api.common.upload.exception.InvalidImageException;
import com.gestion_deportiva.api.config.TimeZoneProperties;
import com.gestion_deportiva.api.photo.dto.ProgressPhotoResponse;
import com.gestion_deportiva.api.photo.dto.ProgressPhotoUploadRequest;
import com.gestion_deportiva.api.photo.exception.FutureTakenOnException;
import com.gestion_deportiva.api.photo.exception.InvalidProgressPhotoTypeException;
import com.gestion_deportiva.api.photo.exception.InvalidTakenOnException;
import com.gestion_deportiva.api.photo.exception.ProgressPhotoNotFoundException;
import com.gestion_deportiva.api.photo.model.ProgressPhoto;
import com.gestion_deportiva.api.photo.model.enums.ProgressPhotoType;
import com.gestion_deportiva.api.photo.repository.ProgressPhotoRepository;
import com.gestion_deportiva.api.storage.ObjectStorage;
import com.gestion_deportiva.api.storage.SignedUrl;
import com.gestion_deportiva.api.storage.StorageUnavailableException;
import com.gestion_deportiva.api.user.model.enums.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static com.gestion_deportiva.api.support.IdentityFixtures.athlete;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static com.gestion_deportiva.api.support.ProgressPhotoFixtures.progressPhoto;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

// Service de fotos de progreso con los puertos simulados: validación, pertenencia, orden de la subida, compensación
// con Storage y la base, listado firmado y borrado. Las fechas de "hoy" salen del reloj de la zona de la app
@ExtendWith(MockitoExtension.class)
class ProgressPhotoServiceTest {

    // 20:14 UTC del 13 de noviembre: en Buenos Aires son las 17:14 del 13
    private static final Instant NOW = Instant.parse("2026-11-13T20:14:31.123456Z");
    private static final UUID ATHLETE_ID = UUID.fromString("3f1c2a9e-8b7d-4c1e-9a2b-5d6e7f8a9b0c");
    private static final AuthenticatedUser ATHLETE_USER = new AuthenticatedUser(ATHLETE_ID, Role.ATHLETE);
    private static final Instant EXPIRES_AT = NOW.plusSeconds(600);
    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0};
    private static final String STORAGE_PATH_PREFIX = "progress/" + ATHLETE_ID + "/";

    @Mock
    private ProgressPhotoRepository progressPhotoRepository;

    @Mock
    private AthleteRepository athleteRepository;

    @Mock
    private AthleteAccessGuard athleteAccessGuard;

    @Mock
    private ImageValidator imageValidator;

    @Mock
    private ObjectStorage objectStorage;

    private ProgressPhotoService service;

    private Athlete leo;

    @BeforeEach
    void setUp() {
        service = serviceAt(NOW);
        leo = athlete("leo@test.com", coach("ana@test.com"));
    }

    private ProgressPhotoService serviceAt(Instant now) {
        AppClock appClock = new AppClock(Clock.fixed(now, ZoneOffset.UTC), new TimeZoneProperties(null));
        // El gestor de transacciones es simulado: el callback corre igual y no hay base real (los efectos de la base se
        // prueban en ProgressPhotoRepositoryTest y en el e2e)
        return new ProgressPhotoService(progressPhotoRepository, athleteRepository, athleteAccessGuard,
                imageValidator, objectStorage, appClock,
                new TransactionTemplate(mock(PlatformTransactionManager.class)));
    }

    // ---------- subida ----------

    @Test
    void shouldStoreTheImageInTheBucketAndSaveTheRowAfterSigningIt() {
        // Arrange
        MockMultipartFile file = new MockMultipartFile("file", "frente.jpg", "image/jpeg", JPEG);
        when(imageValidator.validate(file)).thenReturn(new ValidatedImage(ImageFormat.JPEG, JPEG));
        when(athleteRepository.getReferenceById(ATHLETE_ID)).thenReturn(leo);
        when(objectStorage.createSignedUrl(anyString())).thenAnswer(inv ->
                new SignedUrl("https://signed.test/" + inv.getArgument(0) + "?token=t", EXPIRES_AT));
        when(progressPhotoRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

        // Act
        ProgressPhotoResponse response = service.upload(ATHLETE_USER, ATHLETE_ID,
                new ProgressPhotoUploadRequest(file, "FRONT", "2026-11-12"));

        // Assert: respuesta
        assertEquals("FRONT", response.type());
        assertEquals(LocalDate.of(2026, 11, 12), response.takenOn());
        assertEquals(EXPIRES_AT, response.urlExpiresAt());
        assertEquals(NOW, response.createdAt());

        // Assert: el objeto se sube con el formato detectado y en la ruta del service, y la fila apunta a esa ruta
        ArgumentCaptor<String> path = ArgumentCaptor.forClass(String.class);
        verify(objectStorage).upload(path.capture(), eq(JPEG), eq("image/jpeg"));
        assertTrue(path.getValue().startsWith(STORAGE_PATH_PREFIX) && path.getValue().endsWith(".jpg"),
                path.getValue());
        ArgumentCaptor<ProgressPhoto> saved = ArgumentCaptor.forClass(ProgressPhoto.class);
        verify(progressPhotoRepository).saveAndFlush(saved.capture());
        assertEquals(path.getValue(), saved.getValue().getStoragePath());
        assertEquals(ProgressPhotoType.FRONT, saved.getValue().getType());
        assertEquals(NOW, saved.getValue().getCreatedAt());
        verify(objectStorage, never()).delete(anyString());
    }

    @Test
    void shouldSignTheUrlBeforeSavingTheRow() {
        // Arrange: si la firma falla, todavía no hay fila que deshacer
        MockMultipartFile file = new MockMultipartFile("file", "frente.jpg", "image/jpeg", JPEG);
        when(imageValidator.validate(file)).thenReturn(new ValidatedImage(ImageFormat.JPEG, JPEG));
        when(athleteRepository.getReferenceById(ATHLETE_ID)).thenReturn(leo);
        when(objectStorage.createSignedUrl(anyString())).thenReturn(new SignedUrl("https://signed.test/x", EXPIRES_AT));
        when(progressPhotoRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

        service.upload(ATHLETE_USER, ATHLETE_ID, new ProgressPhotoUploadRequest(file, "SIDE", null));

        InOrder order = inOrder(objectStorage, progressPhotoRepository);
        order.verify(objectStorage).upload(anyString(), any(), anyString());
        order.verify(objectStorage).createSignedUrl(anyString());
        order.verify(progressPhotoRepository).saveAndFlush(any());
    }

    @Test
    void shouldDefaultTakenOnToTodayInTheAppZoneNotInUtc() {
        // A las 22:30 de Buenos Aires ya es el 14 en UTC, pero "hoy" para la app sigue siendo el 13
        ProgressPhotoService lateNight = serviceAt(Instant.parse("2026-11-14T01:30:00Z"));
        MockMultipartFile file = new MockMultipartFile("file", "frente.jpg", "image/jpeg", JPEG);
        when(imageValidator.validate(file)).thenReturn(new ValidatedImage(ImageFormat.JPEG, JPEG));
        when(athleteRepository.getReferenceById(ATHLETE_ID)).thenReturn(leo);
        when(objectStorage.createSignedUrl(anyString())).thenReturn(new SignedUrl("https://signed.test/x", EXPIRES_AT));
        when(progressPhotoRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

        ProgressPhotoResponse response = lateNight.upload(ATHLETE_USER, ATHLETE_ID,
                new ProgressPhotoUploadRequest(file, "BACK", " "));

        assertEquals(LocalDate.of(2026, 11, 13), response.takenOn());
    }

    @ParameterizedTest
    @ValueSource(strings = {"front", "FRONTAL", "", " FRONT "})
    void shouldRejectAnUnknownTypeBeforeTouchingAnything(String type) {
        MockMultipartFile file = new MockMultipartFile("file", "frente.jpg", "image/jpeg", JPEG);

        assertThrows(InvalidProgressPhotoTypeException.class,
                () -> service.upload(ATHLETE_USER, ATHLETE_ID, new ProgressPhotoUploadRequest(file, type, null)));

        verifyNoInteractions(imageValidator, athleteAccessGuard, objectStorage, progressPhotoRepository);
    }

    @Test
    void shouldRejectAMissingType() {
        MockMultipartFile file = new MockMultipartFile("file", "frente.jpg", "image/jpeg", JPEG);

        InvalidProgressPhotoTypeException ex = assertThrows(InvalidProgressPhotoTypeException.class,
                () -> service.upload(ATHLETE_USER, ATHLETE_ID, new ProgressPhotoUploadRequest(file, null, null)));

        assertEquals("type", ex.getField());
    }

    @ParameterizedTest
    @ValueSource(strings = {"12/11/2026", "2026-11-1", "2026-11-12T10:00", "20261112", "+12026-11-12"})
    void shouldRejectTakenOnThatIsNotInTheIsoDateFormat(String takenOn) {
        MockMultipartFile file = new MockMultipartFile("file", "frente.jpg", "image/jpeg", JPEG);

        InvalidTakenOnException ex = assertThrows(InvalidTakenOnException.class,
                () -> service.upload(ATHLETE_USER, ATHLETE_ID,
                        new ProgressPhotoUploadRequest(file, "FRONT", takenOn)));

        assertEquals("takenOn", ex.getField());
        assertEquals("La fecha debe tener el formato AAAA-MM-DD", ex.getMessage());
        verifyNoInteractions(objectStorage);
    }

    @Test
    void shouldRejectADateThatDoesNotExist() {
        MockMultipartFile file = new MockMultipartFile("file", "frente.jpg", "image/jpeg", JPEG);

        assertThrows(InvalidTakenOnException.class,
                () -> service.upload(ATHLETE_USER, ATHLETE_ID, new ProgressPhotoUploadRequest(file, "FRONT",
                        "2026-02-30")));
    }

    @Test
    void shouldRejectAFutureDateButAcceptTodayInTheAppZone() {
        MockMultipartFile file = new MockMultipartFile("file", "frente.jpg", "image/jpeg", JPEG);

        FutureTakenOnException ex = assertThrows(FutureTakenOnException.class,
                () -> service.upload(ATHLETE_USER, ATHLETE_ID, new ProgressPhotoUploadRequest(file, "FRONT",
                        "2026-11-14")));
        assertEquals("La fecha no puede ser futura", ex.getMessage());

        // Hoy en la zona de la app (17:14 del 13) no es futuro
        when(imageValidator.validate(file)).thenReturn(new ValidatedImage(ImageFormat.JPEG, JPEG));
        when(athleteRepository.getReferenceById(ATHLETE_ID)).thenReturn(leo);
        when(objectStorage.createSignedUrl(anyString())).thenReturn(new SignedUrl("https://signed.test/x", EXPIRES_AT));
        when(progressPhotoRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
        ProgressPhotoResponse today = service.upload(ATHLETE_USER, ATHLETE_ID,
                new ProgressPhotoUploadRequest(file, "FRONT", "2026-11-13"));
        assertEquals(LocalDate.of(2026, 11, 13), today.takenOn());
    }

    @Test
    void shouldReportAnInvalidFileBeforeCheckingTheAthlete() {
        MockMultipartFile file = new MockMultipartFile("file", "vacio.jpg", "image/jpeg", new byte[0]);
        when(imageValidator.validate(file)).thenThrow(InvalidImageException.missing());

        assertThrows(InvalidImageException.class,
                () -> service.upload(ATHLETE_USER, ATHLETE_ID, new ProgressPhotoUploadRequest(file, "FRONT", null)));

        verifyNoInteractions(athleteAccessGuard, objectStorage);
    }

    @Test
    void shouldNotStoreAnythingWhenTheAthleteIsNotTheUsers() {
        MockMultipartFile file = new MockMultipartFile("file", "frente.jpg", "image/jpeg", JPEG);
        when(imageValidator.validate(file)).thenReturn(new ValidatedImage(ImageFormat.JPEG, JPEG));
        doThrow(new AthleteAccessDeniedException()).when(athleteAccessGuard).verifyAccess(ATHLETE_USER, ATHLETE_ID);

        assertThrows(AthleteAccessDeniedException.class,
                () -> service.upload(ATHLETE_USER, ATHLETE_ID, new ProgressPhotoUploadRequest(file, "FRONT", null)));

        verify(objectStorage, never()).upload(anyString(), any(), anyString());
    }

    @Test
    void shouldLeaveNoRowWhenTheUploadFailsAndTryToRemoveAPartialObject() {
        MockMultipartFile file = new MockMultipartFile("file", "frente.jpg", "image/jpeg", JPEG);
        when(imageValidator.validate(file)).thenReturn(new ValidatedImage(ImageFormat.JPEG, JPEG));
        doThrow(new StorageUnavailableException("timeout")).when(objectStorage)
                .upload(anyString(), any(), anyString());

        assertThrows(StorageUnavailableException.class,
                () -> service.upload(ATHLETE_USER, ATHLETE_ID, new ProgressPhotoUploadRequest(file, "FRONT", null)));

        verify(objectStorage).delete(anyString());
        verify(progressPhotoRepository, never()).saveAndFlush(any());
    }

    @Test
    void shouldDeleteTheObjectWhenSigningFailsAndSaveNoRow() {
        MockMultipartFile file = new MockMultipartFile("file", "frente.jpg", "image/jpeg", JPEG);
        when(imageValidator.validate(file)).thenReturn(new ValidatedImage(ImageFormat.JPEG, JPEG));
        doThrow(new StorageUnavailableException("firma")).when(objectStorage).createSignedUrl(anyString());

        assertThrows(StorageUnavailableException.class,
                () -> service.upload(ATHLETE_USER, ATHLETE_ID, new ProgressPhotoUploadRequest(file, "FRONT", null)));

        ArgumentCaptor<String> uploaded = ArgumentCaptor.forClass(String.class);
        verify(objectStorage).upload(uploaded.capture(), any(), anyString());
        verify(objectStorage).delete(uploaded.getValue());
        verify(progressPhotoRepository, never()).saveAndFlush(any());
    }

    @Test
    void shouldDeleteTheObjectWhenTheDatabaseFailsAndPropagateTheError() {
        MockMultipartFile file = new MockMultipartFile("file", "frente.jpg", "image/jpeg", JPEG);
        when(imageValidator.validate(file)).thenReturn(new ValidatedImage(ImageFormat.JPEG, JPEG));
        when(athleteRepository.getReferenceById(ATHLETE_ID)).thenReturn(leo);
        when(objectStorage.createSignedUrl(anyString())).thenReturn(new SignedUrl("https://signed.test/x", EXPIRES_AT));
        when(progressPhotoRepository.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("base caída"));

        assertThrows(DataIntegrityViolationException.class,
                () -> service.upload(ATHLETE_USER, ATHLETE_ID, new ProgressPhotoUploadRequest(file, "FRONT", null)));

        ArgumentCaptor<String> uploaded = ArgumentCaptor.forClass(String.class);
        verify(objectStorage).upload(uploaded.capture(), any(), anyString());
        verify(objectStorage).delete(uploaded.getValue());
    }

    @Test
    void shouldKeepTheOriginalErrorWhenTheCompensationAlsoFails() {
        MockMultipartFile file = new MockMultipartFile("file", "frente.jpg", "image/jpeg", JPEG);
        when(imageValidator.validate(file)).thenReturn(new ValidatedImage(ImageFormat.JPEG, JPEG));
        doThrow(new StorageUnavailableException("firma")).when(objectStorage).createSignedUrl(anyString());
        doThrow(new StorageUnavailableException("borrado")).when(objectStorage).delete(anyString());

        StorageUnavailableException ex = assertThrows(StorageUnavailableException.class,
                () -> service.upload(ATHLETE_USER, ATHLETE_ID, new ProgressPhotoUploadRequest(file, "FRONT", null)));

        assertEquals("firma", ex.getMessage());
    }

    // ---------- listado ----------

    @Test
    void shouldListThePageInOrderWithASignedUrlPerPhoto() {
        ProgressPhoto first = progressPhoto(leo, ProgressPhotoType.FRONT, LocalDate.of(2026, 10, 1), "progress/1.jpg");
        ProgressPhoto second = progressPhoto(leo, ProgressPhotoType.SIDE, LocalDate.of(2026, 11, 1), "progress/2.jpg");
        when(progressPhotoRepository.findChronological(eq(ATHLETE_ID), any()))
                .thenReturn(new PageImpl<>(List.of(first, second), PageRequest.of(0, 20), 2));
        when(objectStorage.createSignedUrls(anyList())).thenAnswer(inv -> {
            List<String> paths = inv.getArgument(0);
            return paths.stream().map(path -> new SignedUrl("https://signed.test/" + path, EXPIRES_AT)).toList();
        });

        PageResponse<ProgressPhotoResponse> page = service.findByAthlete(ATHLETE_USER, ATHLETE_ID,
                PageRequest.of(0, 20));

        assertEquals(List.of("FRONT", "SIDE"), page.content().stream().map(ProgressPhotoResponse::type).toList());
        assertEquals("https://signed.test/progress/1.jpg", page.content().get(0).url());
        assertEquals("https://signed.test/progress/2.jpg", page.content().get(1).url());
        assertEquals(EXPIRES_AT, page.content().get(1).urlExpiresAt());
        assertEquals(0, page.page());
        assertEquals(20, page.size());
        assertEquals(2, page.totalElements());
        assertEquals(1, page.totalPages());
    }

    @Test
    void shouldNotCallStorageForAnEmptyPage() {
        when(progressPhotoRepository.findChronological(eq(ATHLETE_ID), any()))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));

        PageResponse<ProgressPhotoResponse> page = service.findByAthlete(ATHLETE_USER, ATHLETE_ID,
                PageRequest.of(0, 20));

        assertTrue(page.content().isEmpty());
        verify(objectStorage, never()).createSignedUrls(anyList());
    }

    // ---------- detalle ----------

    @Test
    void shouldReturnThePhotoWithANewSignedUrl() {
        ProgressPhoto photo = progressPhoto(leo, ProgressPhotoType.BACK, LocalDate.of(2026, 11, 12), "progress/b.jpg");
        when(progressPhotoRepository.findByIdAndAthleteId(photo.getId(), ATHLETE_ID)).thenReturn(Optional.of(photo));
        when(objectStorage.createSignedUrl("progress/b.jpg")).thenReturn(
                new SignedUrl("https://signed.test/b.jpg?token=nuevo", EXPIRES_AT));

        ProgressPhotoResponse response = service.findOne(ATHLETE_USER, ATHLETE_ID, photo.getId());

        assertEquals("BACK", response.type());
        assertEquals("https://signed.test/b.jpg?token=nuevo", response.url());
    }

    @Test
    void shouldAnswerNotFoundForAPhotoOfAnotherAthleteOrAnUnknownId() {
        UUID photoId = UUID.randomUUID();
        when(progressPhotoRepository.findByIdAndAthleteId(photoId, ATHLETE_ID)).thenReturn(Optional.empty());

        ProgressPhotoNotFoundException ex = assertThrows(ProgressPhotoNotFoundException.class,
                () -> service.findOne(ATHLETE_USER, ATHLETE_ID, photoId));

        assertEquals("No existe la foto de progreso con id " + photoId, ex.getMessage());
        verify(objectStorage, never()).createSignedUrl(anyString());
    }

    // ---------- borrado ----------

    @Test
    void shouldDeleteTheRowFirstAndThenTheObject() {
        ProgressPhoto photo = progressPhoto(leo, ProgressPhotoType.FRONT, LocalDate.of(2026, 11, 12), "progress/f.jpg");
        when(progressPhotoRepository.findByIdAndAthleteId(photo.getId(), ATHLETE_ID)).thenReturn(Optional.of(photo));

        service.delete(ATHLETE_USER, ATHLETE_ID, photo.getId());

        InOrder order = inOrder(progressPhotoRepository, objectStorage);
        order.verify(progressPhotoRepository).delete(photo);
        order.verify(progressPhotoRepository).flush();
        order.verify(objectStorage).delete("progress/f.jpg");
    }

    @Test
    void shouldStillSucceedWhenTheObjectCannotBeRemovedAfterTheRowIsGone() {
        ProgressPhoto photo = progressPhoto(leo, ProgressPhotoType.FRONT, LocalDate.of(2026, 11, 12), "progress/f.jpg");
        when(progressPhotoRepository.findByIdAndAthleteId(photo.getId(), ATHLETE_ID)).thenReturn(Optional.of(photo));
        doThrow(new StorageUnavailableException("sin respuesta")).when(objectStorage).delete(anyString());

        service.delete(ATHLETE_USER, ATHLETE_ID, photo.getId());

        verify(progressPhotoRepository).delete(photo);
    }

    @Test
    void shouldAnswerNotFoundWhenDeletingTwiceAndNeverTouchStorage() {
        UUID photoId = UUID.randomUUID();
        when(progressPhotoRepository.findByIdAndAthleteId(photoId, ATHLETE_ID)).thenReturn(Optional.empty());

        assertThrows(ProgressPhotoNotFoundException.class, () -> service.delete(ATHLETE_USER, ATHLETE_ID, photoId));

        verify(progressPhotoRepository, never()).delete(any());
        verify(objectStorage, never()).delete(anyString());
    }
}
