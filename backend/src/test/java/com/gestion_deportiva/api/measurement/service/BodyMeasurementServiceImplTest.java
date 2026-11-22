package com.gestion_deportiva.api.measurement.service;

import com.gestion_deportiva.api.athlete.exception.AthleteAccessDeniedException;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.repository.AthleteRepository;
import com.gestion_deportiva.api.athlete.service.AthleteAccessGuard;
import com.gestion_deportiva.api.common.pagination.PageResponse;
import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import com.gestion_deportiva.api.config.TimeZoneProperties;
import com.gestion_deportiva.api.measurement.dto.BodyMeasurementRecordRequest;
import com.gestion_deportiva.api.measurement.dto.BodyMeasurementRecordResponse;
import com.gestion_deportiva.api.measurement.dto.BodyMeasurementSearchFilter;
import com.gestion_deportiva.api.measurement.exception.BodyMeasurementRecordAlreadyExistsException;
import com.gestion_deportiva.api.measurement.exception.BodyMeasurementRecordNotFoundException;
import com.gestion_deportiva.api.measurement.exception.FutureBodyMeasurementDateException;
import com.gestion_deportiva.api.measurement.model.BodyMeasurementRecord;
import com.gestion_deportiva.api.measurement.model.BodyMeasurementValue;
import com.gestion_deportiva.api.measurement.model.enums.BodyMeasurementType;
import com.gestion_deportiva.api.measurement.model.enums.MeasurementSide;
import com.gestion_deportiva.api.measurement.repository.BodyMeasurementRecordRepository;
import com.gestion_deportiva.api.measurement.repository.BodyMeasurementValueRepository;
import com.gestion_deportiva.api.user.model.enums.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
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

import static com.gestion_deportiva.api.support.BodyMeasurementFixtures.CREATED_AT;
import static com.gestion_deportiva.api.support.BodyMeasurementFixtures.measurement;
import static com.gestion_deportiva.api.support.BodyMeasurementFixtures.record;
import static com.gestion_deportiva.api.support.BodyMeasurementFixtures.recordRequest;
import static com.gestion_deportiva.api.support.BodyMeasurementFixtures.valueRequest;
import static com.gestion_deportiva.api.support.IdentityFixtures.athlete;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BodyMeasurementServiceImplTest {

    private static final UUID ATHLETE_ID = UUID.randomUUID();
    private static final UUID RECORD_ID = UUID.randomUUID();
    private static final AuthenticatedUser ATHLETE_USER = new AuthenticatedUser(ATHLETE_ID, Role.ATHLETE);

    // 23:30 del 6/11 en Argentina (UTC-3): en UTC ya es 7/11
    private static final Instant ARGENTINA_LATE_NIGHT = Instant.parse("2026-11-07T02:30:00Z");
    private static final LocalDate NOV_6 = LocalDate.of(2026, 11, 6);
    private static final LocalDate NOV_7 = LocalDate.of(2026, 11, 7);
    private static final LocalDate JAN_10 = LocalDate.of(2026, 1, 10);

    @Mock
    private BodyMeasurementRecordRepository recordRepository;

    @Mock
    private BodyMeasurementValueRepository valueRepository;

    @Mock
    private AthleteRepository athleteRepository;

    @Mock
    private AthleteAccessGuard athleteAccessGuard;

    private BodyMeasurementServiceImpl service;

    private Athlete athlete;

    @BeforeEach
    void setUp() {
        service = new BodyMeasurementServiceImpl(recordRepository, valueRepository, athleteRepository,
                athleteAccessGuard, Clock.fixed(ARGENTINA_LATE_NIGHT, ZoneOffset.UTC),
                new TimeZoneProperties(TimeZoneProperties.DEFAULT_TIME_ZONE));
        athlete = athlete("leo@test.com", coach("ana@test.com"));
        ReflectionTestUtils.setField(athlete, "id", ATHLETE_ID);
    }

    // ---------- alta ----------

    @Test
    void shouldCreateTheRecordAndItsMeasurementsWithTheClockTimestamps() {
        // Arrange
        when(athleteRepository.getReferenceById(ATHLETE_ID)).thenReturn(athlete);
        when(recordRepository.saveAndFlush(any(BodyMeasurementRecord.class))).thenAnswer(inv -> inv.getArgument(0));
        when(valueRepository.saveAllAndFlush(anyList())).thenAnswer(inv -> inv.getArgument(0));

        // Act
        BodyMeasurementRecordResponse response = service.create(ATHLETE_USER, ATHLETE_ID, recordRequest(NOV_6,
                "  Después  ",
                valueRequest(BodyMeasurementType.ARM, MeasurementSide.RIGHT, "35.25"),
                valueRequest(BodyMeasurementType.WAIST, null, "84.5")));

        // Assert: la pertenencia se controla antes de guardar
        verify(athleteAccessGuard).verifyAccess(ATHLETE_USER, ATHLETE_ID);
        ArgumentCaptor<BodyMeasurementRecord> record = ArgumentCaptor.forClass(BodyMeasurementRecord.class);
        verify(recordRepository).saveAndFlush(record.capture());
        assertSame(athlete, record.getValue().getAthlete());
        assertEquals(NOV_6, record.getValue().getMeasuredOn());
        assertEquals("Después", record.getValue().getComment());
        assertEquals(ARGENTINA_LATE_NIGHT, record.getValue().getCreatedAt());
        assertEquals(ARGENTINA_LATE_NIGHT, record.getValue().getUpdatedAt());

        // Assert: las medidas se guardan con su registro, y la respuesta sale en orden de catálogo
        verify(valueRepository).saveAllAndFlush(anyList());
        assertEquals(List.of(BodyMeasurementType.WAIST, BodyMeasurementType.ARM),
                response.values().stream().map(value -> value.type()).toList());
        assertEquals(new BigDecimal("35.25"), response.values().get(1).value());
    }

    @Test
    void shouldRejectAFutureDateBeforeLookingAtTheAthlete() {
        BodyMeasurementRecordRequest request = recordRequest(NOV_7, valueRequest(BodyMeasurementType.WAIST, null, "80"));

        assertThrows(FutureBodyMeasurementDateException.class,
                () -> service.create(ATHLETE_USER, ATHLETE_ID, request));

        verifyNoInteractions(athleteRepository, athleteAccessGuard, recordRepository, valueRepository);
    }

    @Test
    void shouldRejectADayThatAlreadyHasARecordWithout409Writes() {
        when(recordRepository.existsByAthleteIdAndMeasuredOn(ATHLETE_ID, NOV_6)).thenReturn(true);
        BodyMeasurementRecordRequest request = recordRequest(NOV_6, valueRequest(BodyMeasurementType.WAIST, null, "80"));

        BodyMeasurementRecordAlreadyExistsException ex = assertThrows(
                BodyMeasurementRecordAlreadyExistsException.class,
                () -> service.create(ATHLETE_USER, ATHLETE_ID, request));

        assertEquals("Ya existe un registro de medidas para el 06/11/2026", ex.getMessage());
        verify(recordRepository, never()).saveAndFlush(any());
        verify(valueRepository, never()).saveAllAndFlush(anyList());
    }

    @Test
    void shouldNotSaveAnythingWhenTheAthleteIsNotAllowed() {
        doThrow(new AthleteAccessDeniedException()).when(athleteAccessGuard).verifyAccess(ATHLETE_USER, ATHLETE_ID);
        BodyMeasurementRecordRequest request = recordRequest(NOV_6, valueRequest(BodyMeasurementType.WAIST, null, "80"));

        assertThrows(AthleteAccessDeniedException.class, () -> service.create(ATHLETE_USER, ATHLETE_ID, request));

        verify(recordRepository, never()).saveAndFlush(any());
        verify(valueRepository, never()).saveAllAndFlush(anyList());
    }

    // ---------- edición ----------

    @Test
    void shouldReplaceTheMeasurementsOfTheRecordKeepingItsCreation() {
        // Arrange
        BodyMeasurementRecord existing = record(athlete, JAN_10, "Antes");
        givenTheRecordExists(existing);
        when(recordRepository.saveAndFlush(existing)).thenReturn(existing);
        when(valueRepository.saveAllAndFlush(anyList())).thenAnswer(inv -> inv.getArgument(0));

        // Act
        BodyMeasurementRecordResponse response = service.update(ATHLETE_USER, ATHLETE_ID, RECORD_ID, recordRequest(
                NOV_6, (String) null, valueRequest(BodyMeasurementType.HIP, null, "95")));

        // Assert: el registro se corrige y las medidas viejas se borran antes de insertar las nuevas
        assertEquals(NOV_6, existing.getMeasuredOn());
        assertEquals(CREATED_AT, existing.getCreatedAt());
        assertEquals(ARGENTINA_LATE_NIGHT, existing.getUpdatedAt());
        InOrder order = inOrder(valueRepository);
        order.verify(valueRepository).deleteByRecordId(RECORD_ID);
        order.verify(valueRepository).saveAllAndFlush(anyList());
        assertEquals(List.of(BodyMeasurementType.HIP), response.values().stream()
                .map(value -> value.type()).toList());
    }

    // La fecha propia del registro no es un conflicto: no se consulta la base por ella
    @Test
    void shouldNotCheckTheDayWhenTheDateDoesNotChange() {
        BodyMeasurementRecord existing = record(athlete, NOV_6);
        givenTheRecordExists(existing);
        when(recordRepository.saveAndFlush(existing)).thenReturn(existing);
        when(valueRepository.saveAllAndFlush(anyList())).thenAnswer(inv -> inv.getArgument(0));

        service.update(ATHLETE_USER, ATHLETE_ID, RECORD_ID, recordRequest(NOV_6,
                valueRequest(BodyMeasurementType.WAIST, null, "80")));

        verify(recordRepository, never()).existsByAthleteIdAndMeasuredOn(any(), any());
    }

    @Test
    void shouldRejectMovingTheRecordToADayThatAnotherRecordHolds() {
        BodyMeasurementRecord existing = record(athlete, JAN_10);
        givenTheRecordExists(existing);
        when(recordRepository.existsByAthleteIdAndMeasuredOn(ATHLETE_ID, NOV_6)).thenReturn(true);
        BodyMeasurementRecordRequest request = recordRequest(NOV_6, valueRequest(BodyMeasurementType.WAIST, null, "80"));

        assertThrows(BodyMeasurementRecordAlreadyExistsException.class,
                () -> service.update(ATHLETE_USER, ATHLETE_ID, RECORD_ID, request));

        assertEquals(JAN_10, existing.getMeasuredOn());
        verify(recordRepository, never()).saveAndFlush(any());
        verify(valueRepository, never()).deleteByRecordId(any());
    }

    // Un registro de otro atleta (o inexistente) responde igual: 404
    @Test
    void shouldReturnNotFoundWhenTheRecordIsNotOfThatAthlete() {
        when(recordRepository.findByIdAndAthleteId(RECORD_ID, ATHLETE_ID)).thenReturn(Optional.empty());
        BodyMeasurementRecordRequest request = recordRequest(NOV_6, valueRequest(BodyMeasurementType.WAIST, null, "80"));

        BodyMeasurementRecordNotFoundException ex = assertThrows(BodyMeasurementRecordNotFoundException.class,
                () -> service.update(ATHLETE_USER, ATHLETE_ID, RECORD_ID, request));

        assertEquals("No existe el registro de medidas con id " + RECORD_ID, ex.getMessage());
        verify(valueRepository, never()).deleteByRecordId(any());
    }

    @Test
    void shouldRejectAFutureDateOnUpdateBeforeLookingAtTheRecord() {
        BodyMeasurementRecordRequest request = recordRequest(NOV_7, valueRequest(BodyMeasurementType.WAIST, null, "80"));

        assertThrows(FutureBodyMeasurementDateException.class,
                () -> service.update(ATHLETE_USER, ATHLETE_ID, RECORD_ID, request));

        verifyNoInteractions(athleteRepository, athleteAccessGuard, recordRepository, valueRepository);
    }

    // ---------- listado ----------

    // Las medidas de todos los registros de la página salen en una sola consulta, y se reparten por registro
    @Test
    void shouldGroupTheMeasurementsOfEachRecordOfThePage() {
        // Arrange
        BodyMeasurementRecord newest = record(athlete, NOV_6);
        BodyMeasurementRecord oldest = record(athlete, JAN_10);
        UUID newestId = UUID.randomUUID();
        UUID oldestId = UUID.randomUUID();
        ReflectionTestUtils.setField(newest, "id", newestId);
        ReflectionTestUtils.setField(oldest, "id", oldestId);
        Pageable pageable = PageRequest.of(0, 20);
        when(recordRepository.findNewestFirst(ATHLETE_ID, null, null, pageable))
                .thenReturn(new PageImpl<>(List.of(newest, oldest), pageable, 2));
        when(valueRepository.findByRecordIdIn(List.of(newestId, oldestId))).thenReturn(List.of(
                measurement(newest, BodyMeasurementType.WAIST, null, "84.5"),
                measurement(oldest, BodyMeasurementType.HIP, null, "95")));

        // Act
        PageResponse<BodyMeasurementRecordResponse> page = service.findByAthlete(ATHLETE_USER, ATHLETE_ID,
                new BodyMeasurementSearchFilter(null, null), pageable);

        // Assert
        verify(athleteAccessGuard).verifyAccess(ATHLETE_USER, ATHLETE_ID);
        assertEquals(2, page.content().size());
        assertEquals(List.of(BodyMeasurementType.WAIST), page.content().get(0).values().stream()
                .map(value -> value.type()).toList());
        assertEquals(List.of(BodyMeasurementType.HIP), page.content().get(1).values().stream()
                .map(value -> value.type()).toList());
        assertEquals(2L, page.totalElements());
    }

    // Sin registros no hay nada que buscar: no se consulta la tabla de medidas
    @Test
    void shouldNotQueryTheMeasurementsWhenThePageIsEmpty() {
        Pageable pageable = PageRequest.of(0, 20);
        when(recordRepository.findNewestFirst(ATHLETE_ID, NOV_6, NOV_6, pageable))
                .thenReturn(new PageImpl<>(List.of(), pageable, 0));

        PageResponse<BodyMeasurementRecordResponse> page = service.findByAthlete(ATHLETE_USER, ATHLETE_ID,
                new BodyMeasurementSearchFilter(NOV_6, NOV_6), pageable);

        assertEquals(List.of(), page.content());
        verifyNoInteractions(valueRepository);
    }

    private void givenTheRecordExists(BodyMeasurementRecord existing) {
        when(recordRepository.findByIdAndAthleteId(RECORD_ID, ATHLETE_ID)).thenReturn(Optional.of(existing));
    }
}
