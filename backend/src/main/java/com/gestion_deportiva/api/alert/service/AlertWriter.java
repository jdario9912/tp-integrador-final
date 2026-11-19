package com.gestion_deportiva.api.alert.service;

import com.gestion_deportiva.api.alert.model.Alert;
import com.gestion_deportiva.api.alert.model.enums.AlertType;
import com.gestion_deportiva.api.alert.repository.AlertRepository;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.repository.AthleteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

// Abre las alertas detectadas para un atleta en su propia transacción (REQUIRES_NEW): si falla uno, AlertEvaluator
// sigue con el resto y lo ya confirmado de los demás no se pierde. Está aparte de AlertEvaluator para que la
// anotación pase por el proxy de Spring
@Component
@RequiredArgsConstructor
public class AlertWriter {

    // Período de gracia después de atender una alerta: el mismo tipo no se vuelve a abrir para el atleta hasta que
    // pase este tiempo, aunque la condición siga (si no, reaparecería en el siguiente GET)
    static final Duration HANDLED_COOLDOWN = Duration.ofDays(7);

    private final AlertRepository alertRepository;
    private final AthleteRepository athleteRepository;

    // Solo abre los tipos sin una alerta abierta ni atendida dentro del período de gracia. Devuelve cuántas abrió.
    // saveAndFlush: si otra evaluación abrió la misma alerta a la vez, el índice único parcial falla acá, dentro de
    // la transacción de este atleta
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int openMissing(UUID athleteId, Map<AlertType, String> detected, Instant now) {
        Set<AlertType> blocked = alertRepository.findBlockedTypes(athleteId, now.minus(HANDLED_COOLDOWN));
        Athlete athlete = athleteRepository.getReferenceById(athleteId);
        int opened = 0;
        for (Map.Entry<AlertType, String> entry : detected.entrySet()) {
            if (!blocked.contains(entry.getKey())) {
                alertRepository.saveAndFlush(new Alert(athlete, entry.getKey(), entry.getValue(), now));
                opened++;
            }
        }
        return opened;
    }
}
