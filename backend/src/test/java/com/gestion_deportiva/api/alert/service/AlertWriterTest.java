package com.gestion_deportiva.api.alert.service;

import com.gestion_deportiva.api.alert.model.Alert;
import com.gestion_deportiva.api.alert.model.enums.AlertType;
import com.gestion_deportiva.api.alert.repository.AlertRepository;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.repository.AthleteRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.EnumMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static com.gestion_deportiva.api.support.IdentityFixtures.athlete;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AlertWriterTest {

    private static final UUID ATHLETE_ID = UUID.randomUUID();
    private static final Instant NOW = Instant.parse("2026-11-10T12:00:00Z");

    @Mock
    private AlertRepository alertRepository;

    @Mock
    private AthleteRepository athleteRepository;

    @Test
    void shouldOnlyOpenTheTypesWithoutAnOpenOrRecentlyHandledAlert() {
        // Arrange: NO_ROUTINE ya está abierta (o se atendió hace menos de 7 días); NO_WEIGHT_LOG es nueva
        AlertWriter writer = new AlertWriter(alertRepository, athleteRepository);
        Athlete athlete = athlete("leo@test.com", coach("ana@test.com"));
        when(alertRepository.findBlockedTypes(ATHLETE_ID, NOW.minus(AlertWriter.HANDLED_COOLDOWN)))
                .thenReturn(Set.of(AlertType.NO_ROUTINE));
        when(athleteRepository.getReferenceById(ATHLETE_ID)).thenReturn(athlete);
        Map<AlertType, String> detected = new EnumMap<>(AlertType.class);
        detected.put(AlertType.NO_ROUTINE, "Sin rutina");
        detected.put(AlertType.NO_WEIGHT_LOG, "Sin peso");

        // Act
        int opened = writer.openMissing(ATHLETE_ID, detected, NOW);

        // Assert
        assertEquals(1, opened);
        ArgumentCaptor<Alert> saved = ArgumentCaptor.forClass(Alert.class);
        verify(alertRepository).saveAndFlush(saved.capture());
        assertEquals(AlertType.NO_WEIGHT_LOG, saved.getValue().getType());
        assertEquals(NOW, saved.getValue().getGeneratedAt());
    }
}
