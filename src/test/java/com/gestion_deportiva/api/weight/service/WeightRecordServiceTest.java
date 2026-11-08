package com.gestion_deportiva.api.weight.service;

import com.gestion_deportiva.api.athlete.exception.AthleteAccessDeniedException;
import com.gestion_deportiva.api.athlete.exception.AthleteNotFoundException;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.repository.AthleteRepository;
import com.gestion_deportiva.api.athlete.service.AthleteAccessGuard;
import com.gestion_deportiva.api.common.pagination.PageResponse;
import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import com.gestion_deportiva.api.config.TimeZoneProperties;
import com.gestion_deportiva.api.user.model.enums.Role;
import com.gestion_deportiva.api.weight.dto.WeightRecordRequest;
import com.gestion_deportiva.api.weight.dto.WeightRecordResponse;
import com.gestion_deportiva.api.weight.dto.WeightRecordSearchFilter;
import com.gestion_deportiva.api.weight.exception.FutureWeightRecordDateException;
import com.gestion_deportiva.api.weight.exception.WeightRecordAlreadyExistsException;
import com.gestion_deportiva.api.weight.exception.WeightRecordNotFoundException;
import com.gestion_deportiva.api.weight.model.WeightRecord;
import com.gestion_deportiva.api.weight.repository.WeightRecordRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static com.gestion_deportiva.api.support.IdentityFixtures.athlete;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static com.gestion_deportiva.api.support.WeightRecordFixtures.CREATED_AT;
import static com.gestion_deportiva.api.support.WeightRecordFixtures.weightRecord;
import static com.gestion_deportiva.api.support.WeightRecordFixtures.weightRecordRequest;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WeightRecordServiceTest {

    private static final UUID ATHLETE_ID = UUID.randomUUID();
    private static final UUID WEIGHT_ID = UUID.randomUUID();
    private static final AuthenticatedUser ATHLETE_USER = new AuthenticatedUser(ATHLETE_ID, Role.ATHLETE);

    // 23:30 del 6/11 en Argentina (UTC-3): en UTC ya es 7/11
    private static final Instant ARGENTINA_LATE_NIGHT = Instant.parse("2026-11-07T02:30:00Z");
    // 00:00 del 7/11 en Argentina
    private static final Instant ARGENTINA_MIDNIGHT = Instant.parse("2026-11-07T03:00:00Z");
    private static final LocalDate NOV_6 = LocalDate.of(2026, 11, 6);
    private static final LocalDate NOV_7 = LocalDate.of(2026, 11, 7);

    @Mock
    private WeightRecordRepository weightRecordRepository;

    @Mock
    private AthleteRepository athleteRepository;

    @Mock
    private AthleteAccessGuard athleteAccessGuard;

    private WeightRecordService weightRecordService;

    private Athlete athlete;

    @BeforeEach
    void setUp() {
        weightRecordService = serviceAt(ARGENTINA_LATE_NIGHT, TimeZoneProperties.DEFAULT_TIME_ZONE);
        athlete = athlete("leo@test.com", coach("ana@test.com"));
        ReflectionTestUtils.setField(athlete, "id", ATHLETE_ID);
    }

    // ---------- alta ----------

    @Test
    void shouldCreateTheRecordForTheAthleteWithTheClockTimestamps() {
        // Arrange
        givenTheAthleteCanBeReferenced();
        when(weightRecordRepository.saveAndFlush(any(WeightRecord.class))).thenAnswer(inv -> inv.getArgument(0));

        // Act
        WeightRecordResponse response = weightRecordService.create(ATHLETE_USER, ATHLETE_ID,
                weightRecordRequest(NOV_6, "72.5", "  En ayunas "));

        // Assert
        verify(athleteAccessGuard).verifyAccess(ATHLETE_USER, ATHLETE_ID);
        WeightRecord saved = captureSaved();
        assertSame(athlete, saved.getAthlete());
        assertEquals(NOV_6, saved.getRecordedOn());
        assertEquals(new BigDecimal("72.50"), saved.getWeightKg());
        assertEquals("En ayunas", saved.getComment());
        assertEquals(ARGENTINA_LATE_NIGHT, saved.getCreatedAt());
        assertEquals(ARGENTINA_LATE_NIGHT, saved.getUpdatedAt());
        assertEquals(NOV_6, response.date());
        assertEquals("En ayunas", response.comment());
        assertEquals(response.createdAt(), response.updatedAt());
    }

    @Test
    void shouldStoreABlankCommentAsNull() {
        givenTheAthleteCanBeReferenced();
        when(weightRecordRepository.saveAndFlush(any(WeightRecord.class))).thenAnswer(inv -> inv.getArgument(0));

        WeightRecordResponse response = weightRecordService.create(ATHLETE_USER, ATHLETE_ID,
                weightRecordRequest(NOV_6, "72.5", "   "));

        assertNull(captureSaved().getComment());
        assertNull(response.comment());
    }

    // ---------- fecha futura: "hoy" en la zona de la app ----------

    @Test
    void shouldAcceptTodayInArgentinaAlthoughInUtcItIsAlreadyTomorrow() {
        // Arrange: 2026-11-07T02:30Z son las 23:30 del 6/11 en Argentina
        givenTheAthleteCanBeReferenced();
        when(weightRecordRepository.saveAndFlush(any(WeightRecord.class))).thenAnswer(inv -> inv.getArgument(0));

        // Act
        WeightRecordResponse response = weightRecordService.create(ATHLETE_USER, ATHLETE_ID,
                weightRecordRequest(NOV_6));

        // Assert
        assertEquals(NOV_6, response.date());
    }

    @Test
    void shouldRejectTheUtcDateWhenItIsStillTheDayBeforeInArgentina() {
        // Act: a las 23:30 del 6/11 en Argentina, el 7/11 (el "hoy" de UTC) es futuro
        FutureWeightRecordDateException ex = assertThrows(FutureWeightRecordDateException.class,
                () -> weightRecordService.create(ATHLETE_USER, ATHLETE_ID, weightRecordRequest(NOV_7)));

        // Assert: se valida antes que el atleta (400 antes que 404/403) y no se guarda nada
        assertEquals("date", ex.getField());
        assertEquals("La fecha no puede ser futura", ex.getMessage());
        verifyNoInteractions(athleteAccessGuard, weightRecordRepository, athleteRepository);
    }

    @Test
    void shouldAcceptTheNewDayFromMidnightInArgentina() {
        // Arrange
        weightRecordService = serviceAt(ARGENTINA_MIDNIGHT, TimeZoneProperties.DEFAULT_TIME_ZONE);
        givenTheAthleteCanBeReferenced();
        when(weightRecordRepository.saveAndFlush(any(WeightRecord.class))).thenAnswer(inv -> inv.getArgument(0));

        // Act
        WeightRecordResponse response = weightRecordService.create(ATHLETE_USER, ATHLETE_ID,
                weightRecordRequest(NOV_7));

        // Assert
        assertEquals(NOV_7, response.date());
    }

    @Test
    void shouldRejectTomorrowFromMidnightInArgentina() {
        weightRecordService = serviceAt(ARGENTINA_MIDNIGHT, TimeZoneProperties.DEFAULT_TIME_ZONE);

        assertThrows(FutureWeightRecordDateException.class,
                () -> weightRecordService.create(ATHLETE_USER, ATHLETE_ID, weightRecordRequest(NOV_7.plusDays(1))));
    }

    @Test
    void shouldUseTheConfiguredTimeZone() {
        // Arrange: con la app en UTC, a las 02:30Z del 7/11 "hoy" ya es el 7/11
        weightRecordService = serviceAt(ARGENTINA_LATE_NIGHT, "UTC");
        givenTheAthleteCanBeReferenced();
        when(weightRecordRepository.saveAndFlush(any(WeightRecord.class))).thenAnswer(inv -> inv.getArgument(0));

        // Act
        WeightRecordResponse response = weightRecordService.create(ATHLETE_USER, ATHLETE_ID,
                weightRecordRequest(NOV_7));

        // Assert
        assertEquals(NOV_7, response.date());
    }

    // ---------- alta: pertenencia y día ocupado ----------

    @Test
    void shouldNotTouchTheRecordsWhenTheGuardDeniesAccess() {
        // Arrange
        doThrow(new AthleteAccessDeniedException()).when(athleteAccessGuard).verifyAccess(ATHLETE_USER, ATHLETE_ID);

        // Act + Assert
        assertThrows(AthleteAccessDeniedException.class,
                () -> weightRecordService.create(ATHLETE_USER, ATHLETE_ID, weightRecordRequest(NOV_6)));
        verifyNoInteractions(weightRecordRepository, athleteRepository);
    }

    @Test
    void shouldPropagateTheNotFoundOfTheGuard() {
        doThrow(new AthleteNotFoundException(ATHLETE_ID)).when(athleteAccessGuard)
                .verifyAccess(ATHLETE_USER, ATHLETE_ID);

        assertThrows(AthleteNotFoundException.class,
                () -> weightRecordService.create(ATHLETE_USER, ATHLETE_ID, weightRecordRequest(NOV_6)));
        verifyNoInteractions(weightRecordRepository);
    }

    @Test
    void shouldThrowWithTheDisplayDateWhenTheDayAlreadyHasARecord() {
        // Arrange
        when(weightRecordRepository.existsByAthleteIdAndRecordedOn(ATHLETE_ID, NOV_6)).thenReturn(true);

        // Act
        WeightRecordAlreadyExistsException ex = assertThrows(WeightRecordAlreadyExistsException.class,
                () -> weightRecordService.create(ATHLETE_USER, ATHLETE_ID, weightRecordRequest(NOV_6)));

        // Assert
        assertEquals("Ya existe un registro de peso para el 06/11/2026", ex.getMessage());
        verify(weightRecordRepository, never()).saveAndFlush(any());
    }

    // ---------- edición ----------

    @Test
    void shouldCorrectTheRecordAndUpdateOnlyUpdatedAt() {
        // Arrange
        WeightRecord existing = existingRecord(NOV_6.minusDays(2), "73.1", "Antes");
        when(weightRecordRepository.existsByAthleteIdAndRecordedOn(ATHLETE_ID, NOV_6)).thenReturn(false);
        when(weightRecordRepository.saveAndFlush(existing)).thenReturn(existing);

        // Act
        WeightRecordResponse response = weightRecordService.update(ATHLETE_USER, ATHLETE_ID, WEIGHT_ID,
                weightRecordRequest(NOV_6, "72.5", " Después "));

        // Assert
        verify(athleteAccessGuard).verifyAccess(ATHLETE_USER, ATHLETE_ID);
        assertEquals(WEIGHT_ID, response.id());
        assertEquals(NOV_6, response.date());
        assertEquals(new BigDecimal("72.50"), response.weightKg());
        assertEquals("Después", response.comment());
        assertEquals(CREATED_AT, response.createdAt());
        assertEquals(ARGENTINA_LATE_NIGHT, response.updatedAt());
    }

    @Test
    void shouldNotLookForAConflictWhenTheDateDoesNotChange() {
        // Arrange
        WeightRecord existing = existingRecord(NOV_6, "73.1", "Antes");
        when(weightRecordRepository.saveAndFlush(existing)).thenReturn(existing);

        // Act: sin comentario → queda en null (edición completa)
        WeightRecordResponse response = weightRecordService.update(ATHLETE_USER, ATHLETE_ID, WEIGHT_ID,
                weightRecordRequest(NOV_6, "72.5", null));

        // Assert
        verify(weightRecordRepository, never()).existsByAthleteIdAndRecordedOn(any(), any());
        assertNull(response.comment());
        assertEquals(ARGENTINA_LATE_NIGHT, response.updatedAt());
    }

    @Test
    void shouldThrowAndKeepTheRecordWhenTheNewDateIsTakenByAnotherRecord() {
        // Arrange
        WeightRecord existing = existingRecord(NOV_6.minusDays(2), "73.1", "Antes");
        when(weightRecordRepository.existsByAthleteIdAndRecordedOn(ATHLETE_ID, NOV_6)).thenReturn(true);

        // Act + Assert
        assertThrows(WeightRecordAlreadyExistsException.class, () -> weightRecordService.update(ATHLETE_USER,
                ATHLETE_ID, WEIGHT_ID, weightRecordRequest(NOV_6, "72.5", null)));
        verify(weightRecordRepository, never()).saveAndFlush(any());
        assertEquals(NOV_6.minusDays(2), existing.getRecordedOn());
        assertEquals(new BigDecimal("73.10"), existing.getWeightKg());
        assertEquals("Antes", existing.getComment());
        assertEquals(CREATED_AT, existing.getUpdatedAt());
    }

    @Test
    void shouldThrowNotFoundWhenTheRecordDoesNotExistOrBelongsToAnotherAthlete() {
        // Arrange: la búsqueda filtra por atleta, así que el de otro atleta tampoco aparece
        when(weightRecordRepository.findByIdAndAthleteId(WEIGHT_ID, ATHLETE_ID)).thenReturn(Optional.empty());

        // Act
        WeightRecordNotFoundException ex = assertThrows(WeightRecordNotFoundException.class,
                () -> weightRecordService.update(ATHLETE_USER, ATHLETE_ID, WEIGHT_ID, weightRecordRequest(NOV_6)));

        // Assert
        assertEquals("No existe el registro de peso con id " + WEIGHT_ID, ex.getMessage());
        verify(weightRecordRepository, never()).saveAndFlush(any());
    }

    @Test
    void shouldCheckOwnershipBeforeLookingForTheRecord() {
        doThrow(new AthleteAccessDeniedException()).when(athleteAccessGuard).verifyAccess(ATHLETE_USER, ATHLETE_ID);

        assertThrows(AthleteAccessDeniedException.class, () -> weightRecordService.update(ATHLETE_USER, ATHLETE_ID,
                WEIGHT_ID, weightRecordRequest(NOV_6)));
        verifyNoInteractions(weightRecordRepository);
    }

    @Test
    void shouldRejectAFutureDateInTheUpdateBeforeAnythingElse() {
        assertThrows(FutureWeightRecordDateException.class, () -> weightRecordService.update(ATHLETE_USER,
                ATHLETE_ID, WEIGHT_ID, weightRecordRequest(NOV_7)));
        verifyNoInteractions(athleteAccessGuard, weightRecordRepository);
    }

    // ---------- listado ----------

    @Test
    void shouldListTheRecordsInTheRangeWithTheRequestedPage() {
        // Arrange: un entrenador consulta los registros de su atleta
        AuthenticatedUser coachUser = new AuthenticatedUser(UUID.randomUUID(), Role.COACH);
        Pageable requested = PageRequest.of(1, 2);
        WeightRecordSearchFilter filter = new WeightRecordSearchFilter(NOV_6.minusDays(10), NOV_6);
        when(weightRecordRepository.findNewestFirst(ATHLETE_ID, filter.from(), filter.to(), requested))
                .thenReturn(new PageImpl<>(List.of(weightRecord(athlete, NOV_6, "72.5")), requested, 3));

        // Act
        PageResponse<WeightRecordResponse> page = weightRecordService.findByAthlete(coachUser, ATHLETE_ID, filter,
                requested);

        // Assert
        verify(athleteAccessGuard).verifyAccess(coachUser, ATHLETE_ID);
        assertEquals(1, page.content().size());
        assertEquals(NOV_6, page.content().get(0).date());
        assertEquals(1, page.page());
        assertEquals(2, page.size());
        assertEquals(3, page.totalElements());
        assertEquals(2, page.totalPages());
    }

    @Test
    void shouldNotListWhenTheGuardDeniesAccess() {
        AuthenticatedUser coachUser = new AuthenticatedUser(UUID.randomUUID(), Role.COACH);
        doThrow(new AthleteAccessDeniedException()).when(athleteAccessGuard).verifyAccess(coachUser, ATHLETE_ID);

        assertThrows(AthleteAccessDeniedException.class, () -> weightRecordService.findByAthlete(coachUser,
                ATHLETE_ID, new WeightRecordSearchFilter(null, null), PageRequest.of(0, 20)));
        verify(weightRecordRepository, never()).findNewestFirst(any(), any(), any(), any());
    }

    private WeightRecordService serviceAt(Instant now, String timeZone) {
        return new WeightRecordService(weightRecordRepository, athleteRepository, athleteAccessGuard,
                Clock.fixed(now, ZoneOffset.UTC), new TimeZoneProperties(timeZone));
    }

    private void givenTheAthleteCanBeReferenced() {
        when(athleteRepository.getReferenceById(ATHLETE_ID)).thenReturn(athlete);
    }

    // Registro guardado (con id y CREATED_AT) que findByIdAndAthleteId devuelve para el atleta
    private WeightRecord existingRecord(LocalDate date, String weightKg, String comment) {
        WeightRecord existing = weightRecord(athlete, date, weightKg, comment);
        ReflectionTestUtils.setField(existing, "id", WEIGHT_ID);
        when(weightRecordRepository.findByIdAndAthleteId(WEIGHT_ID, ATHLETE_ID)).thenReturn(Optional.of(existing));
        return existing;
    }

    private WeightRecord captureSaved() {
        ArgumentCaptor<WeightRecord> captor = ArgumentCaptor.forClass(WeightRecord.class);
        verify(weightRecordRepository).saveAndFlush(captor.capture());
        return captor.getValue();
    }
}
