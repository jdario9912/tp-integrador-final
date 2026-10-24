package com.gestion_deportiva.api.athlete.service;

import com.gestion_deportiva.api.athlete.exception.AthleteAccessDeniedException;
import com.gestion_deportiva.api.athlete.exception.AthleteNotFoundException;
import com.gestion_deportiva.api.athlete.repository.AthleteRepository;
import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.UUID;

// Pertenencia de datos (US-04, SVC-02 "verificarPertenencia" del UML): un entrenador solo accede a sus atletas
// y un atleta solo a sus propios datos. Se llama desde los services, no solo desde el controller, para que ningún
// camino nuevo a los datos de un atleta la saltee. Está aparte de AthleteService para que la usen también los
// módulos de rutinas, sesiones y progreso.
@Component
@RequiredArgsConstructor
public class AthleteAccessGuard {

    private static final Logger log = LoggerFactory.getLogger(AthleteAccessGuard.class);

    private final AthleteRepository athleteRepository;

    // 404 si el atleta no existe; 403 si existe pero no le pertenece a quien llama.
    // Los ids son UUID: distinguir los dos casos no permite enumerar atletas
    public void verifyAccess(AuthenticatedUser user, UUID athleteId) {
        if (!athleteRepository.existsById(athleteId)) {
            throw new AthleteNotFoundException(athleteId);
        }

        boolean allowed = switch (user.role()) {
            // Un atleta desvinculado (sin entrenador) no le pertenece a ningún entrenador
            case COACH -> athleteRepository.existsByIdAndCoachId(athleteId, user.id());
            case ATHLETE -> user.id().equals(athleteId);
        };

        if (!allowed) {
            log.warn("Acceso denegado: el usuario {} ({}) pidió los datos del atleta {}",
                    user.id(), user.role(), athleteId);
            throw new AthleteAccessDeniedException();
        }
    }
}
